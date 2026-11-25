import {NextResponse} from 'next/server';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {razorpayAuthorization,razorpayConfig} from '@/lib/razorpay';
import {text,validEmail,validPhone} from '@/lib/validation';
import {submissionGuard} from '@/lib/public-readiness';

export async function POST(request:Request){
  const blocked=submissionGuard(request,'membership-pay');if(blocked)return NextResponse.json({error:blocked.message},{status:blocked.status});
  const config=razorpayConfig();
  if(!config?.webhookSecret||!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:'Online membership payment is not available until the Society payment setup is complete.'},{status:503});
  const form=await request.formData();
  if(text(form.get('website')))return NextResponse.json({error:'Invalid request.'},{status:400});
  const fullName=text(form.get('full_name'),120),email=text(form.get('email'),254).toLowerCase(),phone=text(form.get('phone'),24);
  const designation=text(form.get('designation'),120),institution=text(form.get('institution'),180),city=text(form.get('city'),100);
  const categoryId=text(form.get('category_id'),80),consent=form.get('consent')==='on';
  if(!fullName||!validEmail(email)||!validPhone(phone)||!categoryId||!consent)return NextResponse.json({error:'Please check the required application details and consent.'},{status:400});

  const db=createSupabaseAdminClient();
  const {data:application,error:applicationError}=await db.rpc('create_paid_membership_application',{
    p_full_name:fullName,p_email:email,p_phone:phone,p_designation:designation||null,
    p_institution:institution||null,p_city:city||null,p_category_id:categoryId,p_consent:consent,
  });
  if(applicationError||!application){
    const message=applicationError?.message||'';
    const status=message.includes('current membership category')?400:message.includes('does not have an approved payable fee')||message.includes('INR')?409:400;
    return NextResponse.json({error:status===400?'Please check your application details.':message},{status});
  }
  const applicationId=String(application.application_id||'');
  const amount=Number(application.amount_minor);
  const currency=String(application.currency||'');
  const categoryName=String(application.category_name||'Membership');
  if(!applicationId||!Number.isSafeInteger(amount)||amount<100||currency!=='INR')return NextResponse.json({error:'This membership category is not configured for online payment.'},{status:503});

  if(application.existing){
    const {data:existingPayment}=await db.from('payments').select('id,provider_order_id,amount_minor,currency,status').eq('membership_application_id',applicationId).eq('provider','razorpay').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(existingPayment?.status==='paid')return NextResponse.json({error:'This application is already paid and is being reviewed by the Society.'},{status:409});
    if(existingPayment?.provider_order_id)return NextResponse.json({keyId:config.keyId,orderId:existingPayment.provider_order_id,amount:existingPayment.amount_minor,currency:existingPayment.currency,description:categoryName,applicationId});
  }

  const {data:payment,error:paymentInsertError}=await db.from('payments').insert({membership_application_id:applicationId,provider:'razorpay',amount_minor:amount,currency,status:'created'}).select('id').single();
  if(paymentInsertError){await db.from('membership_applications').update({payment_status:'failed'}).eq('id',applicationId);return NextResponse.json({error:'Could not prepare the payment. Please try again.'},{status:500});}
  const receipt=`TPSM${applicationId.replaceAll('-','')}`;
  let orderResponse:Response;
  try{
    orderResponse=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{authorization:razorpayAuthorization(config.keyId,config.keySecret),'content-type':'application/json'},body:JSON.stringify({amount,currency,receipt,notes:{membership_application_id:applicationId,membership_category:categoryName}}),cache:'no-store',signal:AbortSignal.timeout(15000)});
  }catch{
    await db.from('payments').update({status:'failed'}).eq('id',payment.id);
    await db.from('membership_applications').update({payment_status:'failed'}).eq('id',applicationId);
    return NextResponse.json({error:'Payment service could not be reached. Please try again later.'},{status:502});
  }
  const order=await orderResponse.json().catch(()=>null);
  if(!orderResponse.ok||!order?.id||order.amount!==amount||order.currency!==currency){
    await db.from('payments').update({status:'failed'}).eq('id',payment.id);
    await db.from('membership_applications').update({payment_status:'failed'}).eq('id',applicationId);
    return NextResponse.json({error:'The payment service could not create an order. Please try again later.'},{status:502});
  }
  const {error:saveOrderError}=await db.from('payments').update({provider_order_id:order.id}).eq('id',payment.id);
  if(saveOrderError){
    await db.from('payments').update({status:'failed'}).eq('id',payment.id);
    await db.from('membership_applications').update({payment_status:'failed'}).eq('id',applicationId);
    return NextResponse.json({error:'The payment order could not be linked to the application.'},{status:500});
  }
  return NextResponse.json({keyId:config.keyId,orderId:order.id,amount,currency,description:categoryName,applicationId});
}

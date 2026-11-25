import {NextResponse} from 'next/server';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {razorpayAuthorization,razorpayConfig} from '@/lib/razorpay';
import {text,validEmail,validPhone} from '@/lib/validation';
import {submissionGuard} from '@/lib/public-readiness';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const blocked=submissionGuard(request,'event-pay');if(blocked)return NextResponse.json({error:blocked.message},{status:blocked.status});
  const config=razorpayConfig();
  if(!config||!config.webhookSecret||!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:'Paid registration is not available until the Society payment setup is complete.'},{status:503});
  const {id:eventId}=await params;
  const form=await request.formData();
  if(text(form.get('website')))return NextResponse.json({error:'Invalid request.'},{status:400});
  const fullName=text(form.get('full_name'),120),email=text(form.get('email'),254).toLowerCase(),phone=text(form.get('phone'),24);
  const institution=text(form.get('institution'),180),designation=text(form.get('designation'),120),consent=form.get('consent')==='on';
  if(!fullName||!validEmail(email)||!validPhone(phone)||!consent)return NextResponse.json({error:'Please check the required details and consent.'},{status:400});

  const db=createSupabaseAdminClient();
  const {data:reservation,error:reservationError}=await db.rpc('create_paid_event_registration',{
    p_event_id:eventId,p_full_name:fullName,p_email:email,p_phone:phone,
    p_institution:institution||null,p_designation:designation||null,p_consent:consent,
  });
  if(reservationError){
    const message=reservationError.message||'';
    const status=message.includes('Event not found')?404:message.includes('full')||message.includes('already has')||message.includes('closed')||message.includes('not opened')?409:400;
    return NextResponse.json({error:status===400?'Please check your registration details.':message},{status});
  }
  if(!reservation||typeof reservation!=='object')return NextResponse.json({error:'Could not reserve a place. Please try again.'},{status:500});
  const registrationId=String(reservation.registration_id||'');
  const amount=Number(reservation.amount_minor);
  const currency=String(reservation.currency||'');
  const eventTitle=String(reservation.event_title||'Society event');
  if(!registrationId||!Number.isSafeInteger(amount)||amount<100||currency!=='INR'){
    if(registrationId)await db.from('event_registrations').update({status:'cancelled',payment_status:'failed'}).eq('id',registrationId);
    return NextResponse.json({error:'This event is not configured for online payment.'},{status:503});
  }
  if(reservation.existing){
    const {data:existingPayment}=await db.from('payments').select('provider_order_id,amount_minor,currency,status').eq('event_registration_id',registrationId).eq('provider','razorpay').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(existingPayment?.status==='paid')return NextResponse.json({error:'This registration is already paid.'},{status:409});
    if(existingPayment?.provider_order_id&&['created','pending'].includes(existingPayment.status))return NextResponse.json({keyId:config.keyId,orderId:existingPayment.provider_order_id,amount:existingPayment.amount_minor,currency:existingPayment.currency,eventTitle,registrationId});
  }
  const {data:payment,error:paymentInsertError}=await db.from('payments').insert({event_registration_id:registrationId,provider:'razorpay',amount_minor:amount,currency,status:'created'}).select('id').single();
  if(paymentInsertError){await db.from('event_registrations').update({status:'cancelled',payment_status:'failed'}).eq('id',registrationId);return NextResponse.json({error:'Could not prepare the payment. Please try again.'},{status:500});}

  const receipt=`TPS${registrationId.replaceAll('-','')}`;
  let orderResponse:Response;
  try{
    orderResponse=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{authorization:razorpayAuthorization(config.keyId,config.keySecret),'content-type':'application/json'},body:JSON.stringify({amount,currency,receipt,notes:{event_registration_id:registrationId,event_id:eventId}}),cache:'no-store',signal:AbortSignal.timeout(15000)});
  }catch{
    await db.from('payments').update({status:'failed'}).eq('id',payment.id);
    await db.from('event_registrations').update({status:'cancelled',payment_status:'failed'}).eq('id',registrationId);
    return NextResponse.json({error:'Payment service could not be reached. Please try again later.'},{status:502});
  }
  const order=await orderResponse.json().catch(()=>null);
  if(!orderResponse.ok||!order?.id||order.amount!==amount||order.currency!==currency){
    await db.from('payments').update({status:'failed'}).eq('id',payment.id);
    await db.from('event_registrations').update({status:'cancelled',payment_status:'failed'}).eq('id',registrationId);
    return NextResponse.json({error:'The payment service could not create an order. Please try again later.'},{status:502});
  }
  const {error:saveOrderError}=await db.from('payments').update({provider_order_id:order.id}).eq('id',payment.id);
  if(saveOrderError){
    await db.from('payments').update({status:'failed'}).eq('id',payment.id);
    await db.from('event_registrations').update({status:'cancelled',payment_status:'failed'}).eq('id',registrationId);
    return NextResponse.json({error:'The payment order could not be linked to the registration.'},{status:500});
  }
  return NextResponse.json({keyId:config.keyId,orderId:order.id,amount,currency,eventTitle,registrationId});
}

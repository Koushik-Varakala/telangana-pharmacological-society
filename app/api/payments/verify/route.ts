import {NextResponse} from 'next/server';
import {submissionGuard} from '@/lib/public-readiness';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {razorpayAuthorization,razorpayConfig,verifyRazorpayPaymentSignature} from '@/lib/razorpay';
import {text} from '@/lib/validation';

export async function POST(request:Request){
  const blocked=submissionGuard(request,'payment-verify');if(blocked)return NextResponse.json({error:blocked.message},{status:blocked.status});
  const config=razorpayConfig();
  if(!config||!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:'Payment verification is not configured.'},{status:503});
  const body=await request.json().catch(()=>null);
  const orderId=text(body?.razorpay_order_id,80),paymentId=text(body?.razorpay_payment_id,80),signature=text(body?.razorpay_signature,256);
  if(!orderId||!paymentId||!signature)return NextResponse.json({error:'Payment details are incomplete.'},{status:400});

  const db=createSupabaseAdminClient();
  const {data:payment,error}=await db.from('payments').select('id,event_registration_id,membership_application_id,amount_minor,currency,status').eq('provider','razorpay').eq('provider_order_id',orderId).maybeSingle();
  if(error||!payment||(!payment.event_registration_id&&!payment.membership_application_id))return NextResponse.json({error:'Payment order was not found.'},{status:404});
  if(!verifyRazorpayPaymentSignature(orderId,paymentId,signature,config.keySecret))return NextResponse.json({error:'Payment signature could not be verified.'},{status:400});
  if(payment.status==='paid')return NextResponse.json({ok:true,status:'paid'});

  let response:Response;
  try{response=await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,{headers:{authorization:razorpayAuthorization(config.keyId,config.keySecret)},cache:'no-store',signal:AbortSignal.timeout(12000)});}catch{return NextResponse.json({ok:true,status:'processing'});}
  const providerPayment=await response.json().catch(()=>null);
  if(!response.ok||!providerPayment)return NextResponse.json({ok:true,status:'processing'});
  if(providerPayment.order_id!==orderId||providerPayment.amount!==payment.amount_minor||providerPayment.currency!==payment.currency)return NextResponse.json({error:'Payment details do not match this order.'},{status:400});
  if(providerPayment.status!=='captured')return NextResponse.json({ok:true,status:'processing'});

  const {error:updatePaymentError}=await db.from('payments').update({provider_payment_id:paymentId,status:'paid',updated_at:new Date().toISOString()}).eq('id',payment.id);
  if(updatePaymentError)return NextResponse.json({ok:true,status:'processing'});
  if(payment.event_registration_id){
    const {error:updateRegistrationError}=await db.from('event_registrations').update({payment_status:'paid'}).eq('id',payment.event_registration_id).eq('status','registered');
    if(updateRegistrationError)return NextResponse.json({ok:true,status:'processing'});
  }else{
    const {error:updateApplicationError}=await db.from('membership_applications').update({payment_status:'paid'}).eq('id',payment.membership_application_id);
    if(updateApplicationError)return NextResponse.json({ok:true,status:'processing'});
  }
  return NextResponse.json({ok:true,status:'paid'});
}

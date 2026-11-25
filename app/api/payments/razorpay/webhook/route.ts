import {NextResponse} from 'next/server';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {razorpayConfig,verifyRazorpayWebhookSignature} from '@/lib/razorpay';

export async function POST(request:Request){
  const config=razorpayConfig();
  if(!config?.webhookSecret||!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:'Webhook processing is not configured.'},{status:503});
  const rawBody=await request.text();
  const signature=request.headers.get('x-razorpay-signature')||'';
  const eventId=request.headers.get('x-razorpay-event-id')||'';
  if(!signature||!eventId||!verifyRazorpayWebhookSignature(rawBody,signature,config.webhookSecret))return NextResponse.json({error:'Invalid webhook signature.'},{status:400});
  let event:{event?:string;payload?:{order?:{entity?:Record<string,unknown>};payment?:{entity?:Record<string,unknown>}}};
  try{event=JSON.parse(rawBody)}catch{return NextResponse.json({error:'Webhook body is invalid.'},{status:400})}
  if(!event.event)return NextResponse.json({error:'Webhook event is missing.'},{status:400});

  const paymentEntity=event.payload?.payment?.entity||{};
  const orderEntity=event.payload?.order?.entity||{};
  const orderId=String(event.event==='order.paid'?orderEntity.id||'':paymentEntity.order_id||'');
  if(orderId){
    const db=createSupabaseAdminClient();
    const {data:payment}=await db.from('payments').select('id,event_registration_id,membership_application_id,amount_minor,currency,status').eq('provider','razorpay').eq('provider_order_id',orderId).maybeSingle();
    if(payment){
      const isPaid=event.event==='order.paid'||event.event==='payment.captured';
      const isFailed=event.event==='payment.failed';
      const providerAmount=Number(event.event==='order.paid'?(orderEntity.amount_paid??orderEntity.amount):paymentEntity.amount);
      const providerCurrency=String(event.event==='order.paid'?orderEntity.currency||'':paymentEntity.currency||'');
      const paidState=event.event==='order.paid'?orderEntity.status==='paid':paymentEntity.status==='captured';
      if((isPaid||isFailed)&&providerAmount===payment.amount_minor&&providerCurrency===payment.currency){
        if(isPaid&&paidState){
          const paymentId=String(paymentEntity.id||'');
          const update={status:'paid',updated_at:new Date().toISOString(),...(paymentId?{provider_payment_id:paymentId}:{})};
          const {error:paymentError}=await db.from('payments').update(update).eq('id',payment.id);
          if(paymentError)return NextResponse.json({error:'Could not save payment state.'},{status:500});
          if(payment.event_registration_id){
            const {error:registrationError}=await db.from('event_registrations').update({payment_status:'paid'}).eq('id',payment.event_registration_id).eq('status','registered');
            if(registrationError)return NextResponse.json({error:'Could not save registration payment state.'},{status:500});
          }else if(payment.membership_application_id){
            const {error:applicationError}=await db.from('membership_applications').update({payment_status:'paid'}).eq('id',payment.membership_application_id);
            if(applicationError)return NextResponse.json({error:'Could not save application payment state.'},{status:500});
          }
        }else if(isFailed&&payment.status!=='paid'){
          const {error:paymentError}=await db.from('payments').update({status:'failed',updated_at:new Date().toISOString()}).eq('id',payment.id).neq('status','paid');
          if(paymentError)return NextResponse.json({error:'Could not save failed payment state.'},{status:500});
          if(payment.event_registration_id){
            const {error:registrationError}=await db.from('event_registrations').update({payment_status:'failed'}).eq('id',payment.event_registration_id).eq('status','registered').neq('payment_status','paid');
            if(registrationError)return NextResponse.json({error:'Could not save registration payment state.'},{status:500});
          }else if(payment.membership_application_id){
            const {error:applicationError}=await db.from('membership_applications').update({payment_status:'failed'}).eq('id',payment.membership_application_id).neq('payment_status','paid');
            if(applicationError)return NextResponse.json({error:'Could not save application payment state.'},{status:500});
          }
        }
      }
    }
  }

  const db=createSupabaseAdminClient();
  const {error:logError}=await db.from('razorpay_webhook_events').upsert({event_id:eventId,event_type:event.event},{onConflict:'event_id',ignoreDuplicates:true});
  if(logError)return NextResponse.json({error:'Could not record webhook event.'},{status:500});
  return NextResponse.json({ok:true});
}

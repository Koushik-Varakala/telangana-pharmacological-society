'use client';

import Script from 'next/script';
import {useRef,useState} from 'react';
import type {RazorpayCheckoutResult} from '@/lib/razorpay-browser';

type PaymentOrder={keyId:string;orderId:string;amount:number;currency:string;eventTitle:string;registrationId:string};

export function RazorpayEventPaymentForm({eventId,eventTitle,amountMinor,currency}:{eventId:string;eventTitle:string;amountMinor:number;currency:string}){
  const [order,setOrder]=useState<PaymentOrder|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [scriptReady,setScriptReady]=useState(false);
  const formRef=useRef<HTMLFormElement>(null);
  const submitting=useRef(false);
  const [customer,setCustomer]=useState<{fullName:string;email:string;phone:string}|null>(null);

  function openCheckout(currentOrder:PaymentOrder,values:{fullName:string;email:string;phone:string}){
    if(!window.Razorpay){setMessage('Secure checkout is loading. Please try again in a moment.');return}
    setBusy(true);
    const checkout=new window.Razorpay({
      key:currentOrder.keyId,amount:currentOrder.amount,currency:currentOrder.currency,
      name:'Telangana Pharmacological Society',description:currentOrder.eventTitle,order_id:currentOrder.orderId,
      prefill:{name:values.fullName,email:values.email,contact:values.phone},notes:{registration_id:currentOrder.registrationId},theme:{color:'#183b43'},
      handler:async(result:RazorpayCheckoutResult)=>{
        setMessage('Verifying payment securely…');
        try{
          const response=await fetch('/api/payments/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(result)});
          const data=await response.json();
          if(!response.ok)throw new Error(data.error||'Payment verification could not be completed.');
          setMessage(data.status==='paid'?'Payment confirmed. Your event registration is complete.':'Payment received by checkout. Confirmation is still processing; please wait before trying again.');
        }catch(error){setMessage(error instanceof Error?error.message:'Payment confirmation is still processing. Please wait before trying again.')}
        finally{setBusy(false)}
      },
      modal:{ondismiss:()=>{setBusy(false);setMessage('Checkout closed. If you submitted payment, wait for confirmation before retrying.')}}
    });
    checkout.on('payment.failed',response=>{setBusy(false);setMessage(response.error?.description||'Payment did not complete. You can retry the same checkout order.')});
    checkout.open();
  }

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!scriptReady||!window.Razorpay){setMessage('Secure checkout is loading. Please try again in a moment.');return}
    if(submitting.current)return;
    submitting.current=true;
    setBusy(true);setMessage('');
    const form=event.currentTarget;
    const data=new FormData(form);
    const values={fullName:String(data.get('full_name')||''),email:String(data.get('email')||''),phone:String(data.get('phone')||'')};
    try{
      const response=await fetch(`/api/events/${eventId}/pay`,{method:'POST',body:data});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Could not prepare checkout.');
      const currentOrder:PaymentOrder=result;
      setOrder(currentOrder);
      setCustomer(values);
      setBusy(false);
      openCheckout(currentOrder,values);
    }catch(error){setBusy(false);setMessage(error instanceof Error?error.message:'Could not prepare checkout. Please try again.')}
    finally{submitting.current=false}
  }

  const fee=new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:2}).format(amountMinor/100);
  return <>
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onReady={()=>setScriptReady(true)} onError={()=>setMessage('Secure checkout could not load. Please refresh and try again.')}/>
    <form ref={formRef} className="form-card" onSubmit={submit}>
      <p className="payment-fee">Registration fee <strong>{fee}</strong></p>
      <label>Full name<input name="full_name" required maxLength={120}/></label>
      <label>Email<input name="email" type="email" required maxLength={254}/></label>
      <label>Phone<input name="phone" type="tel" required maxLength={24}/></label>
      <label>Institution <span>(optional)</span><input name="institution" maxLength={180}/></label>
      <label>Designation <span>(optional)</span><input name="designation" maxLength={120}/></label>
      <label className="consent"><input name="consent" type="checkbox" required/><span>I agree that the Society may use these details to administer this registration and confirm payment. Read the <a href="/privacy-policy">draft privacy notice</a>.</span></label>
      <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
      {order&&customer?<button className="button form-submit" type="button" disabled={busy} onClick={()=>openCheckout(order,customer)}>{busy?'Waiting for payment…':'Continue payment'}</button>:<button className="button form-submit" disabled={busy||!scriptReady}>{busy?'Preparing secure checkout…':`Continue to payment · ${fee}`}<span aria-hidden="true">→</span></button>}
      <p className="form-message" role="status">{message}</p>
    </form>
  </>;
}

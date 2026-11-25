'use client';

import Script from 'next/script';
import {useRef,useState} from 'react';
import type {RazorpayCheckoutResult} from '@/lib/razorpay-browser';

type Category={id:string;name:string;fee_minor:number|null;currency:string};
type PaymentOrder={keyId:string;orderId:string;amount:number;currency:string;description:string;applicationId:string};
type Customer={fullName:string;email:string;phone:string};

export function MembershipApplicationForm({categories,paymentsReady}:{categories:Category[];paymentsReady:boolean}){
  const formRef=useRef<HTMLFormElement>(null);
  const submitting=useRef(false);
  const [selectedId,setSelectedId]=useState('');
  const [order,setOrder]=useState<PaymentOrder|null>(null);
  const [customer,setCustomer]=useState<Customer|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [scriptReady,setScriptReady]=useState(false);
  const category=categories.find(item=>item.id===selectedId);
  const needsPayment=Boolean(category&&category.fee_minor&&category.fee_minor>0);
  const unsupportedCurrency=Boolean(needsPayment&&category?.currency!=='INR');
  const fee=category?.fee_minor!==null&&category?.fee_minor!==undefined?new Intl.NumberFormat('en-IN',{style:'currency',currency:category.currency,maximumFractionDigits:2}).format(category.fee_minor/100):'';

  function openCheckout(currentOrder:PaymentOrder,values:Customer){
    if(!window.Razorpay){setMessage('Secure checkout is loading. Please try again in a moment.');return}
    setBusy(true);
    const checkout=new window.Razorpay({
      key:currentOrder.keyId,amount:currentOrder.amount,currency:currentOrder.currency,
      name:'Telangana Pharmacological Society',description:currentOrder.description,order_id:currentOrder.orderId,
      prefill:{name:values.fullName,email:values.email,contact:values.phone},notes:{application_id:currentOrder.applicationId},theme:{color:'#183b43'},
      handler:async(result:RazorpayCheckoutResult)=>{
        setMessage('Verifying payment securely…');
        try{
          const response=await fetch('/api/payments/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(result)});
          const data=await response.json();
          if(!response.ok)throw new Error(data.error||'Payment verification could not be completed.');
          setMessage(data.status==='paid'?'Payment confirmed. Your application has been received and will be reviewed by the Society.':'Payment is processing. Your application status will update once the payment is confirmed.');
        }catch(error){setMessage(error instanceof Error?error.message:'Payment confirmation is processing. Please wait before trying again.')}
        finally{setBusy(false)}
      },
      modal:{ondismiss:()=>{setBusy(false);setMessage('Checkout closed. If you submitted payment, wait for confirmation before retrying.')}}
    });
    checkout.on('payment.failed',response=>{setBusy(false);setMessage(response.error?.description||'Payment did not complete. You can retry the same checkout order.')});
    checkout.open();
  }

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(submitting.current)return;
    submitting.current=true;
    const form=event.currentTarget;
    const data=new FormData(form);
    const values={fullName:String(data.get('full_name')||''),email:String(data.get('email')||''),phone:String(data.get('phone')||'')};
    setBusy(true);setMessage('');
    const endpoint=needsPayment?'/api/membership/pay':'/api/membership';
    try{
      if(needsPayment&&(!paymentsReady||!scriptReady))throw new Error('Online payment is being prepared. Please try again later.');
      const response=await fetch(endpoint,{method:'POST',body:data});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Could not submit the application.');
      if(needsPayment){const currentOrder:PaymentOrder=result;setOrder(currentOrder);setCustomer(values);setBusy(false);openCheckout(currentOrder,values);return}
      form.reset();setSelectedId('');
      setMessage('Thank you. Your membership enquiry has been received. It does not grant membership.');
    }catch(error){setMessage(error instanceof Error?error.message:'Please try again later.')}
    finally{submitting.current=false;setBusy(false)}
  }

  return <>
    {needsPayment&&paymentsReady&&<Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onReady={()=>setScriptReady(true)} onError={()=>setMessage('Secure checkout could not load. Please refresh and try again.')}/>}
    <form ref={formRef} className="form-card" onSubmit={submit}>
      {categories.length>0&&<label>Membership category<select name="category_id" required value={selectedId} onChange={event=>{setSelectedId(event.target.value);setOrder(null);setMessage('')}}><option value="" disabled>Select a category</option>{categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      {category&&<p className="payment-fee">{needsPayment?'Application fee': 'Fee'} <strong>{fee||'To be confirmed'}</strong></p>}
      {needsPayment&&!paymentsReady&&<p className="review-note">Online payment will open after the Society payment account is configured.</p>}
      {unsupportedCurrency&&<p className="review-note">Online membership payment is currently available in INR only.</p>}
      <label>Full name<input name="full_name" required maxLength={120}/></label>
      <label>Email<input name="email" type="email" required maxLength={254}/></label>
      <label>Phone<input name="phone" type="tel" required maxLength={24}/></label>
      <label>Designation <span>(optional)</span><input name="designation" maxLength={120}/></label>
      <label>Institution <span>(optional)</span><input name="institution" maxLength={180}/></label>
      <label>City <span>(optional)</span><input name="city" maxLength={100}/></label>
      <label className="consent"><input name="consent" type="checkbox" required/><span>I consent to the Society using these details to process this application and respond. Read the <a href="/privacy-policy">draft privacy notice</a>.</span></label>
      <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
      {order&&customer?<button className="button form-submit" type="button" disabled={busy} onClick={()=>openCheckout(order,customer)}>{busy?'Waiting for payment…':'Continue payment'}</button>:<button className="button form-submit" disabled={busy||(needsPayment&&(!paymentsReady||unsupportedCurrency||!scriptReady))}>{busy?'Submitting…':needsPayment?`Apply and pay · ${fee}`:'Send membership enquiry'}<span aria-hidden="true">→</span></button>}
      {needsPayment&&<small className="payment-note">Submitting an application and payment does not automatically grant membership. The Society will review the application.</small>}
      <p className="form-message" role="status">{message}</p>
    </form>
  </>;
}

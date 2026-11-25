import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';

export function razorpayConfig(){
  const keyId=process.env.RAZORPAY_KEY_ID;
  const keySecret=process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret=process.env.RAZORPAY_WEBHOOK_SECRET;
  if(!keyId||!keySecret)return null;
  return {keyId,keySecret,webhookSecret};
}

function signatureMatches(expected:string,received:string){
  if(!/^[a-f0-9]+$/i.test(received)||expected.length!==received.length)return false;
  return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(received,'hex'));
}

export function verifyRazorpayPaymentSignature(orderId:string,paymentId:string,received:string,keySecret:string){
  const expected=createHmac('sha256',keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return signatureMatches(expected,received);
}

export function verifyRazorpayWebhookSignature(rawBody:string,received:string,secret:string){
  const expected=createHmac('sha256',secret).update(rawBody).digest('hex');
  return signatureMatches(expected,received);
}

export function razorpayAuthorization(keyId:string,keySecret:string){
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

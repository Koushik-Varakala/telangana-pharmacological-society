import {NextResponse} from 'next/server';
import {createSupabaseServerClient,hasSupabaseConfig} from '@/lib/supabase/server';
import {text,validEmail} from '@/lib/validation';
import {notifySociety} from '@/lib/notifications';
import {submissionGuard} from '@/lib/public-readiness';
export async function POST(request:Request){
  const blocked=submissionGuard(request,'contact');if(blocked)return NextResponse.json({error:blocked.message},{status:blocked.status});
  if(!hasSupabaseConfig())return NextResponse.json({error:'The contact form is not available yet. Official contact details have not been provided.'},{status:503});
  const body=await request.formData();
  if(text(body.get('website')))return NextResponse.json({ok:true});
  const name=text(body.get('name'),120),email=text(body.get('email'),254).toLowerCase(),subject=text(body.get('subject'),160),message=text(body.get('message'),3000);
  if(!name||!validEmail(email)||message.length<10)return NextResponse.json({error:'Please check your name, email and message.'},{status:400});
  const db=await createSupabaseServerClient();
  const {error}=await db.from('contact_messages').insert({name,email,subject,message,status:'new'});
  if(error)return NextResponse.json({error:'We could not save your message. Please try later.'},{status:500});
  const notification=await notifySociety({subject:`New Society website enquiry${subject?`: ${subject}`:''}`,text:`Name: ${name}\nEmail: ${email}\n\n${message}`}).catch(()=>({sent:false}));
  return NextResponse.json({ok:true,notificationSent:notification.sent});
}

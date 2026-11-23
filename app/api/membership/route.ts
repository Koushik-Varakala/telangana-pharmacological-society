import {NextResponse} from 'next/server';
import {createSupabaseServerClient,hasSupabaseConfig} from '@/lib/supabase/server';
import {text,validEmail,validPhone} from '@/lib/validation';
import {notifySociety} from '@/lib/notifications';
export async function POST(request:Request){
  if(!hasSupabaseConfig())return NextResponse.json({error:'Online applications are not available yet. Please contact the Society when official contact details are published.'},{status:503});
  const body=await request.formData();
  if(text(body.get('website')))return NextResponse.json({ok:true});
  const fullName=text(body.get('full_name'),120),email=text(body.get('email'),254).toLowerCase(),phone=text(body.get('phone'),24),designation=text(body.get('designation'),120),institution=text(body.get('institution'),180),city=text(body.get('city'),100),categoryId=text(body.get('category_id'),80),consent=body.get('consent')==='on';
  if(!fullName||!validEmail(email)||!validPhone(phone)||!consent)return NextResponse.json({error:'Please provide a name, valid email and phone number, and consent.'},{status:400});
  const db=await createSupabaseServerClient();
  if(categoryId){const {data:category}=await db.from('membership_categories').select('id').eq('id',categoryId).eq('published',true).maybeSingle();if(!category)return NextResponse.json({error:'Please select a current membership category.'},{status:400})}
  const {error}=await db.from('membership_applications').insert({full_name:fullName,email,phone,designation,institution,city,category_id:categoryId||null,consent_at:new Date().toISOString(),status:'received',payment_status:'not_started'});
  if(error)return NextResponse.json({error:'We could not save your application. Please try later.'},{status:500});
  const notification=await notifySociety({subject:'New Society membership enquiry',text:`Name: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nInstitution: ${institution||'—'}\nCity: ${city||'—'}`}).catch(()=>({sent:false}));
  return NextResponse.json({ok:true,notificationSent:notification.sent});
}

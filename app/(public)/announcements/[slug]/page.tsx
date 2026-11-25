import {notFound} from 'next/navigation';
import Link from 'next/link';
import {PageIntro} from '@/components/page-intro';
import {createSupabaseServerClient,hasSupabaseConfig} from '@/lib/supabase/server';
import {isExpired} from '@/lib/date';

export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return {title:`${slug.replaceAll('-',' ')} | Telangana Pharmacological Society`}}

export default async function AnnouncementPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!hasSupabaseConfig())notFound();
  const db=await createSupabaseServerClient();
  const {data:item}=await db.from('announcements').select('title,summary,body,image_path,published_at,expires_on').eq('slug',slug).eq('published',true).maybeSingle();
  if(!item)notFound();
  let imageUrl='';
  if(item.image_path){const {data:image}=await db.storage.from('society-public-assets').createSignedUrl(item.image_path,3600);imageUrl=image?.signedUrl||''}
  const date=item.published_at?new Intl.DateTimeFormat('en-IN',{dateStyle:'long',timeZone:'Asia/Kolkata'}).format(new Date(item.published_at)):'';
  return <><PageIntro eyebrow={`${isExpired(item.expires_on)?'From the archive · ':''}${date||'Society update'}`} title={item.title} description={item.summary||'An announcement from the Telangana Pharmacological Society.'}/><article className="section"><div className="wrap announcement-article">{imageUrl&&<img className="announcement-feature-image" src={imageUrl} alt=""/>}{item.body&&<div className="announcement-full-body">{item.body}</div>}<Link className="text-link" href="/announcements">← All announcements</Link></div></article></>;
}

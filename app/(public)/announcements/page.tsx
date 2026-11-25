import Link from 'next/link';
import {PageIntro} from '@/components/page-intro';
import {emptyCopy} from '@/lib/content';
import {createSupabaseServerClient,hasSupabaseConfig} from '@/lib/supabase/server';
import {isExpired} from '@/lib/date';

export const metadata={title:'News & announcements | Telangana Pharmacological Society'};
export const dynamic='force-dynamic';

export default async function AnnouncementsPage(){
  let items:{id:string;title:string;slug:string|null;summary:string|null;image_path:string|null;published_at:string|null;expires_on:string|null}[]=[];
  let cards:{item:typeof items[number];imageUrl:string}[]=[];
  if(hasSupabaseConfig()){
    const db=await createSupabaseServerClient();
    const {data}=await db.from('announcements').select('id,title,slug,summary,image_path,published_at,expires_on').eq('published',true).order('published_at',{ascending:false});
    items=data||[];
    cards=await Promise.all(items.map(async item=>{
      const {data:image}=item.image_path?await db.storage.from('society-public-assets').createSignedUrl(item.image_path,3600):{data:null};
      return {item,imageUrl:image?.signedUrl||''};
    }));
  }
  return <><PageIntro eyebrow="News from the Society" title="News & announcements" description="Approved notices, updates and announcements from the Telangana Pharmacological Society."/><section className="section"><div className="wrap">{cards.length?<div className="published-grid announcement-archive">{cards.map(({item,imageUrl})=><article className="published-card" key={item.id}>{imageUrl&&<img className="content-cover" src={imageUrl} alt=""/>}<span className="eyebrow">{isExpired(item.expires_on)?'In history · ':''}{item.published_at?new Intl.DateTimeFormat('en-IN',{dateStyle:'long',timeZone:'Asia/Kolkata'}).format(new Date(item.published_at)):'Society update'}</span><h2>{item.slug?<Link href={`/announcements/${item.slug}`}>{item.title}</Link>:item.title}</h2>{item.summary&&<p>{item.summary}</p>}{item.slug&&<Link href={`/announcements/${item.slug}`}>Read announcement →</Link>}</article>)}</div>:<div className="empty-state"><span className="empty-icon">✳</span><h2>No announcements yet</h2><p>{emptyCopy.announcements}</p></div>}</div></section></>;
}

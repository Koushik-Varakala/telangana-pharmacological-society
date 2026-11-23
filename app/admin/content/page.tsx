import {PageIntro} from '@/components/page-intro';
import {createSupabaseServerClient,hasSupabaseConfig} from '@/lib/supabase/server';
import Link from 'next/link';
const tables=['announcements','committee_members','publications','resources'];
export const metadata={title:'Content management | Society admin'};
export default async function ContentManagement(){let counts:Record<string,number>={};if(hasSupabaseConfig()){const db=await createSupabaseServerClient();await Promise.all(tables.map(async table=>{const {count}=await db.from(table).select('id',{count:'exact',head:true});counts[table]=count||0}))}return <><PageIntro eyebrow="Admin / Content" title="Society content" description="Create and update approved public information. Profiles remain hidden until confirmed."/><section className="section"><div className="wrap admin-modules">{tables.map(table=><Link href={`/admin/content/${table==='committee_members'?'committee':table}`} key={table}><span className="eyebrow">Content</span><h2>{table.replaceAll('_',' ')}</h2><p>{hasSupabaseConfig()?`${counts[table]||0} records in the database.`:'Database setup required.'} Open content manager →</p></Link>)}</div></section></>}

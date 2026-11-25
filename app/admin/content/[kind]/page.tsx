import Link from 'next/link';
import {notFound} from 'next/navigation';
import {PageIntro} from '@/components/page-intro';
import {AdminContentForm} from '@/components/admin-content-form';
import {DeletePublicationForm} from '@/components/delete-publication-form';
import {DeleteAnnouncementForm} from '@/components/delete-announcement-form';
import {DeleteContentForm} from '@/components/delete-content-form';
import {isExpired} from '@/lib/date';
import {createSupabaseServerClient,hasSupabaseConfig} from '@/lib/supabase/server';

const definitions={announcements:{table:'announcements',title:'Announcements'},committee:{table:'committee_members',title:'Committee'},publications:{table:'publications',title:'Publications'},resources:{table:'resources',title:'Resources'}} as const;

export default async function ContentKindPage({params}:{params:Promise<{kind:string}>}){
  const {kind}=await params;
  if(!(kind in definitions))notFound();
  const key=kind as keyof typeof definitions;
  const def=definitions[key];
  let records:any[]=[];
  if(hasSupabaseConfig()){
    const db=await createSupabaseServerClient();
    const {data}=await db.from(def.table).select('*').order('created_at',{ascending:false});
    records=data||[];
  }
  return <>
    <PageIntro eyebrow={`Admin / ${def.title}`} title={`Manage ${def.title.toLowerCase()}`} description="Draft, review and publish Society-approved website content."/>
    <section className="section"><div className="wrap"><div className="content-manager">
      <div><h2>Add a record</h2><AdminContentForm kind={key}/></div>
      <div><h2>Existing records</h2>{records.length?<div className="admin-records">{records.map(record=><article key={record.id}>
        <span className="eyebrow">{record.published?'Published':'Draft'}{key==='committee'&&!record.confirmed?' · Not confirmed':''}{key==='announcements'&&isExpired(record.expires_on)?' · In history':''}</span>
        <h3>{record.title||record.display_name}</h3>
        <p>{record.summary||record.role_title||record.description||record.biography}</p>
        <div className="admin-record-controls">
          <Link href={`/admin/content/${key}/${record.id}`}>Edit record →</Link>
          {key==='publications'&&<DeletePublicationForm id={record.id}/>}
          {key==='announcements'&&<DeleteAnnouncementForm id={record.id}/>}
          {key==='committee'&&<DeleteContentForm id={record.id} kind="committee" label="committee profile"/>}
          {key==='resources'&&<DeleteContentForm id={record.id} kind="resources" label="resource"/>}
        </div>
      </article>)}</div>:<div className="review-note">No records yet. Once saved, draft content remains private until published.</div>}</div>
    </div></div></section>
  </>;
}

import {notFound} from 'next/navigation';
import {PageIntro} from '@/components/page-intro';
import {AdminContentForm} from '@/components/admin-content-form';
import {DeleteAnnouncementForm} from '@/components/delete-announcement-form';
import {DeleteContentForm} from '@/components/delete-content-form';
import {createSupabaseServerClient,hasSupabaseConfig} from '@/lib/supabase/server';

const definitions={announcements:{table:'announcements',title:'Announcement'},committee:{table:'committee_members',title:'Committee profile'},publications:{table:'publications',title:'Publication'},resources:{table:'resources',title:'Resource'}} as const;

export default async function EditContent({params}:{params:Promise<{kind:string;id:string}>}){
  const {kind,id}=await params;
  if(!(kind in definitions)||!hasSupabaseConfig())notFound();
  const key=kind as keyof typeof definitions;
  const def=definitions[key];
  const db=await createSupabaseServerClient();
  const {data:record}=await db.from(def.table).select('*').eq('id',id).maybeSingle();
  if(!record)notFound();
  return <>
    <PageIntro eyebrow={`Admin / ${def.title}`} title={`Edit ${def.title.toLowerCase()}`} description="Update the record and control whether approved content is public."/>
    <section className="section"><div className="wrap admin-editor-wrap">
      {(key==='announcements'||key==='committee'||key==='resources')&&<div className="admin-actions">
        {key==='announcements'&&<DeleteAnnouncementForm id={record.id}/>}
        {key==='committee'&&<DeleteContentForm id={record.id} kind="committee" label="committee profile"/>}
        {key==='resources'&&<DeleteContentForm id={record.id} kind="resources" label="resource"/>}
      </div>}
      <AdminContentForm kind={key} record={record}/>
    </div></section>
  </>;
}

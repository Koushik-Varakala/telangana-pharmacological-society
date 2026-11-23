import {notFound} from 'next/navigation';
import {PageIntro} from '@/components/page-intro';
import {SubmitForm} from '@/components/submit-form';
import {createSupabaseServerClient,hasSupabaseConfig} from '@/lib/supabase/server';

export default async function EventDetail({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!hasSupabaseConfig())notFound();
  const db=await createSupabaseServerClient();
  const {data:event}=await db.from('events').select('id,title,event_type,description,starts_at,ends_at,venue,registration_opens_at,registration_closes_at,fee_minor,currency').eq('slug',slug).eq('published',true).maybeSingle();
  if(!event)notFound();
  const registrationTime=Date.now();
  const registrationNotOpen=event.registration_opens_at&&new Date(event.registration_opens_at).getTime()>registrationTime;
  const registrationClosed=event.registration_closes_at&&new Date(event.registration_closes_at).getTime()<registrationTime;
  const [{data:people},{data:items}]=await Promise.all([
    db.from('event_speakers').select('id,name,title,biography').eq('event_id',event.id).order('display_order'),
    db.from('event_schedule').select('id,title,description,starts_at,ends_at').eq('event_id',event.id).order('display_order'),
  ]);
  return <>
    <PageIntro eyebrow={event.event_type} title={event.title} description={event.description}/>
    <section className="section"><div className="wrap">
      <div className="event-detail">
        <div><h2>Event information</h2><p>{event.starts_at?new Intl.DateTimeFormat('en-IN',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(event.starts_at)):'Date to be announced'}</p><p>{event.venue||'Venue to be announced'}</p>{event.registration_closes_at&&<p>Registration closes {new Intl.DateTimeFormat('en-IN',{dateStyle:'long',timeZone:'Asia/Kolkata'}).format(new Date(event.registration_closes_at))}</p>}</div>
        <div>{event.fee_minor>0?<div className="review-note">Paid registration is unavailable until the Society’s payment gateway is configured.</div>:registrationNotOpen?<div className="review-note">Registration opens {new Intl.DateTimeFormat('en-IN',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(event.registration_opens_at!))}.</div>:registrationClosed?<div className="review-note">Registration for this event has closed.</div>:<SubmitForm action={`/api/events/${event.id}/register`} button="Register for this event"><label>Full name<input name="full_name" required maxLength={120}/></label><label>Email<input name="email" type="email" required maxLength={254}/></label><label>Phone<input name="phone" type="tel" required maxLength={24}/></label><label>Institution <span>(optional)</span><input name="institution" maxLength={180}/></label><label>Designation <span>(optional)</span><input name="designation" maxLength={120}/></label><label className="consent"><input name="consent" type="checkbox" required/><span>I agree that the Society may use these details to administer this registration.</span></label></SubmitForm>}</div>
      </div>
      {items?.length?<section className="event-more"><h2>Schedule</h2><div className="schedule-list">{items.map(item=><article key={item.id}><span>{item.starts_at?new Intl.DateTimeFormat('en-IN',{timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(item.starts_at)):'Time to be announced'}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div></section>:null}
      {people?.length?<section className="event-more"><h2>Speakers</h2><div className="speaker-grid">{people.map(person=><article key={person.id}><span className="eyebrow">{person.title}</span><h3>{person.name}</h3><p>{person.biography}</p></article>)}</div></section>:null}
    </div></section>
  </>;
}

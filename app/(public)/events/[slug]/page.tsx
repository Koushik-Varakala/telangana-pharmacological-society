import {notFound} from 'next/navigation';
import {PageIntro} from '@/components/page-intro';
import {SubmitForm} from '@/components/submit-form';
import {RazorpayEventPaymentForm} from '@/components/razorpay-event-payment-form';
import {createSupabaseServerClient,hasSupabaseConfig} from '@/lib/supabase/server';
import {isKnownTestEvent,publicFormsEnabled} from '@/lib/public-readiness';

export default async function EventDetail({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(!hasSupabaseConfig())notFound();
  const db=await createSupabaseServerClient();
  const {data:event}=await db.from('events').select('*').eq('slug',slug).eq('published',true).maybeSingle();
  if(!event||isKnownTestEvent(event))notFound();
  const [{data:poster},{data:brochure}]=await Promise.all([
    event.poster_path?db.storage.from('society-public-assets').createSignedUrl(event.poster_path,3600):Promise.resolve({data:null}),
    event.brochure_path?db.storage.from('society-public-assets').createSignedUrl(event.brochure_path,3600):Promise.resolve({data:null}),
  ]);
  const paymentsReady=Boolean(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET&&process.env.RAZORPAY_WEBHOOK_SECRET&&process.env.SUPABASE_SERVICE_ROLE_KEY);
  const registrationTime=Date.now();
  const ended=(event.ends_at||event.starts_at)&&new Date(event.ends_at||event.starts_at).getTime()<registrationTime;
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
        <div><h2>Event information</h2><p>{event.starts_at?new Intl.DateTimeFormat('en-IN',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(event.starts_at)):'Date to be announced'}</p>{event.ends_at&&<p>Ends {new Intl.DateTimeFormat('en-IN',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(event.ends_at))}</p>}<p>{event.venue||'Venue to be announced'}</p>{event.organiser_info&&<p><strong>Organised by</strong><br/>{event.organiser_info}</p>}{event.registration_closes_at&&<p>Registration closes {new Intl.DateTimeFormat('en-IN',{dateStyle:'long',timeZone:'Asia/Kolkata'}).format(new Date(event.registration_closes_at))}</p>}{poster?.signedUrl&&<img className="event-poster" src={poster.signedUrl} alt={`${event.title} poster`}/ >}{brochure?.signedUrl&&<a className="button button-outline" href={brochure.signedUrl} target="_blank" rel="noreferrer">Download event brochure ↓</a>}</div>
        <div>{ended?<div className="review-note">This event has concluded. Registration is closed.</div>:!publicFormsEnabled()?<div className="review-note">Online registration is being prepared. Please return after the Society announces registration opening.</div>:registrationNotOpen?<div className="review-note">Registration opens {new Intl.DateTimeFormat('en-IN',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(event.registration_opens_at!))}.</div>:registrationClosed?<div className="review-note">Registration for this event has closed.</div>:event.fee_minor>0?paymentsReady?<RazorpayEventPaymentForm eventId={event.id} eventTitle={event.title} amountMinor={event.fee_minor} currency={event.currency}/>:<div className="review-note">Paid registration will open after the Society’s payment account and server configuration are complete.</div>:<SubmitForm action={`/api/events/${event.id}/register`} button="Register for this event"><label>Full name<input name="full_name" required maxLength={120}/></label><label>Email<input name="email" type="email" required maxLength={254}/></label><label>Phone<input name="phone" type="tel" required maxLength={24}/></label><label>Institution <span>(optional)</span><input name="institution" maxLength={180}/></label><label>Designation <span>(optional)</span><input name="designation" maxLength={120}/></label><label className="consent"><input name="consent" type="checkbox" required/><span>I agree that the Society may use these details to administer this registration. Read the <a href="/privacy-policy">draft privacy notice</a>.</span></label></SubmitForm>}</div>
      </div>
      {items?.length?<section className="event-more"><h2>Schedule</h2><div className="schedule-list">{items.map(item=><article key={item.id}><span>{item.starts_at?new Intl.DateTimeFormat('en-IN',{timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(item.starts_at)):'Time to be announced'}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div></section>:null}
      {people?.length?<section className="event-more"><h2>Speakers</h2><div className="speaker-grid">{people.map(person=><article key={person.id}><span className="eyebrow">{person.title}</span><h3>{person.name}</h3><p>{person.biography}</p></article>)}</div></section>:null}
    </div></section>
  </>;
}

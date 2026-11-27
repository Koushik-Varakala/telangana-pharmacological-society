import Link from 'next/link';
import {createSupabaseServerClient,hasSupabaseConfig} from '@/lib/supabase/server';

export const metadata={title:'Admin dashboard | Telangana Pharmacological Society'};

const guideSections=[
  {title:'Public website content',items:[
    {name:'Announcements',href:'/admin/content/announcements',what:'Publish time-sensitive Society notices and updates.',where:'News & announcements; current items may also appear on the homepage. Expired items remain in the archive as history.',use:'Use for approved calls, notices and updates. Set an expiry date when the notice should leave the homepage.'},
    {name:'Committee',href:'/admin/content/committee',what:'Manage public executive committee profiles.',where:'Executive Committee page.',use:'Publish names and roles only after Society confirmation; unconfirmed profiles stay hidden.'},
    {name:'Publications',href:'/admin/content/publications',what:'Share Society publications with an optional cover image and document.',where:'Publications page, with selected items featured on the homepage.',use:'Use for approved newsletters, academic updates and Society publications. Drafts remain private.'},
    {name:'Resources',href:'/admin/content/resources',what:'Make approved learning materials and documents available.',where:'Learning resources page.',use:'Use for forms, brochures, notices and other materials the Society wants visitors to access.'},
    {name:'Gallery',href:'/admin/gallery',what:'Organise event photos into albums, add captions and manage visibility.',where:'Public Gallery page; only published albums and their images appear.',use:'Create an album for a Society programme, upload suitable images, then publish when approved.'},
  ]},
  {title:'Events and participation',items:[
    {name:'Events',href:'/admin/events',what:'Create and manage event details, dates, venue, organiser information, speakers, schedule and event files.',where:'Events & conferences page and each event detail page. Past events move into the archive based on their date.',use:'Save a draft while details are being confirmed. Publish when approved. Free event registration is available where configured; paid registration awaits payment setup.'},
    {name:'Event registrations',href:'/admin/events',what:'Review attendee registrations for an individual event and download its attendee CSV.',where:'Open an event, then choose its Registrations link.',use:'Use to prepare attendee lists and review registration/payment status. These are event attendees, not membership applicants.'},
  ]},
  {title:'Membership',items:[
    {name:'Membership setup',href:'/admin/membership-categories',what:'Manage membership categories, eligibility and fees.',where:'Membership page when a category is published.',use:'Enter only Society-approved terms. Categories without approved information should remain unpublished.'},
    {name:'Membership registrations',href:'/admin/registrations',what:'Review submitted membership applications, their payment status and Society review status.',where:'Private to authorised administrators; personal details are not shown publicly.',use:'Use this separate workspace to process membership applications. An application or payment by itself does not confirm membership.'},
  ]},
  {title:'Enquiries',items:[
    {name:'Messages',href:'/admin/messages',what:'Read and update the status of messages submitted through the contact form.',where:'Private to authorised administrators.',use:'Mark messages as read or resolved as the Society handles them. This inbox does not contain membership applications or event registrations.'},
  ]},
];

export default async function Dashboard(){
  let totals:{events:number;registrations:number;applications:number;messages:number}|null=null;
  if(hasSupabaseConfig()){
    const db=await createSupabaseServerClient();
    const [events,registrations,apps,messages]=await Promise.all([
      db.from('events').select('id',{count:'exact',head:true}).eq('published',true).gte('starts_at',new Date().toISOString()),
      db.from('event_registrations').select('id',{count:'exact',head:true}),
      db.from('membership_applications').select('id',{count:'exact',head:true}),
      db.from('contact_messages').select('id',{count:'exact',head:true}).eq('status','new'),
    ]);
    totals={events:events.count||0,registrations:registrations.count||0,applications:apps.count||0,messages:messages.count||0};
  }
  return <main className="admin-page"><div className="wrap">
    <span className="eyebrow">Administration</span><h1>Dashboard</h1>
    <p className="admin-dashboard-lede">A guide to the admin area: what each section manages, where approved content appears and how to use it.</p>
    {totals?<div className="admin-counts"><div><span>Upcoming published events</span><b>{totals.events}</b></div><div><span>Event registrations</span><b>{totals.registrations}</b></div><div><span>Membership applications</span><b>{totals.applications}</b></div><div><span>New contact messages</span><b>{totals.messages}</b></div></div>:<div className="review-note">Connect Supabase and apply the database migration to show Society records.</div>}
    <div className="admin-guide">{guideSections.map(section=><section className="admin-guide-section" key={section.title}>
      <h2>{section.title}</h2><div className="admin-guide-grid">{section.items.map(item=><article className="admin-guide-card" key={item.name}>
        <h3><Link href={item.href}>{item.name} <span aria-hidden="true">→</span></Link></h3>
        <dl><div><dt>What it does</dt><dd>{item.what}</dd></div><div><dt>Where it appears</dt><dd>{item.where}</dd></div><div><dt>When to use it</dt><dd>{item.use}</dd></div></dl>
      </article>)}</div>
    </section>)}</div>
  </div></main>;
}

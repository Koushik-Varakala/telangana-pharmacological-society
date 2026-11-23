create extension if not exists pgcrypto;

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(), slug text unique not null,
  title text not null, content jsonb not null default '{}'::jsonb,
  published boolean not null default false, updated_at timestamptz not null default now()
);
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(), title text not null, slug text unique,
  summary text not null default '', body text not null default '', image_path text,
  published boolean not null default false, published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.committee_members (
  id uuid primary key default gen_random_uuid(), display_name text not null,
  role_title text not null, biography text, photo_path text, display_order integer not null default 0,
  confirmed boolean not null default false, published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.membership_categories (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  eligibility text, fee_minor integer check (fee_minor is null or fee_minor >= 0), currency char(3) not null default 'INR',
  published boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.membership_applications (
  id uuid primary key default gen_random_uuid(), full_name text not null, email text not null,
  phone text not null, designation text, institution text, city text,
  category_id uuid references public.membership_categories(id) on delete set null,
  consent_at timestamptz not null, status text not null default 'received' check(status in ('received','reviewing','contacted','closed')),
  payment_status text not null default 'not_started' check(payment_status in ('not_started','pending','paid','failed','refunded')),
  created_at timestamptz not null default now()
);
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null,
  event_type text not null default 'Academic programme', description text not null default '',
  starts_at timestamptz, ends_at timestamptz, venue text, registration_opens_at timestamptz,
  registration_closes_at timestamptz, capacity integer check(capacity is null or capacity > 0),
  fee_minor integer not null default 0 check(fee_minor >= 0), currency char(3) not null default 'INR',
  poster_path text, brochure_path text, published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.event_speakers (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  name text not null, title text, biography text, photo_path text, display_order integer not null default 0
);
create table if not exists public.event_schedule (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  starts_at timestamptz, ends_at timestamptz, title text not null, description text, display_order integer not null default 0
);
create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id),
  full_name text not null, email text not null, phone text not null, institution text, designation text, city text,
  status text not null default 'registered' check(status in ('registered','cancelled','attended')),
  payment_status text not null default 'not_required' check(payment_status in ('not_required','pending','paid','failed','refunded')),
  created_at timestamptz not null default now()
);
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(), membership_application_id uuid references public.membership_applications(id),
  event_registration_id uuid references public.event_registrations(id), provider text not null,
  provider_order_id text unique, provider_payment_id text unique, amount_minor integer not null check(amount_minor >= 0),
  currency char(3) not null default 'INR', status text not null check(status in ('created','pending','paid','failed','refunded')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(num_nonnulls(membership_application_id,event_registration_id)=1)
);
create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(), title text not null, summary text, category text,
  published_on date, cover_path text, file_path text, published boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  category text, file_path text, published boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.gallery_albums (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  event_date date, published boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(), album_id uuid not null references public.gallery_albums(id) on delete cascade,
  file_path text not null, caption text, display_order integer not null default 0
);
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null,
  subject text, message text not null, status text not null default 'new' check(status in ('new','read','resolved')),
  created_at timestamptz not null default now()
);

create index if not exists events_public_dates on public.events(published,starts_at);
create index if not exists applications_created on public.membership_applications(created_at desc);
create index if not exists registrations_event on public.event_registrations(event_id,created_at desc);
create index if not exists messages_status on public.contact_messages(status,created_at desc);
create index if not exists payments_application on public.payments(membership_application_id);
create index if not exists payments_registration on public.payments(event_registration_id);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.admin_profiles where id=auth.uid() and role='admin');
$$;
alter table public.admin_profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.pages enable row level security;
alter table public.announcements enable row level security;
alter table public.committee_members enable row level security;
alter table public.membership_categories enable row level security;
alter table public.membership_applications enable row level security;
alter table public.events enable row level security;
alter table public.event_speakers enable row level security;
alter table public.event_schedule enable row level security;
alter table public.event_registrations enable row level security;
alter table public.payments enable row level security;
alter table public.publications enable row level security;
alter table public.resources enable row level security;
alter table public.gallery_albums enable row level security;
alter table public.gallery_images enable row level security;
alter table public.contact_messages enable row level security;

create policy "Admins manage profiles" on public.admin_profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage pages" on public.pages for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads published pages" on public.pages for select using (published);
create policy "Admins manage announcements" on public.announcements for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads published announcements" on public.announcements for select using (published);
create policy "Admins manage committee" on public.committee_members for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads confirmed committee" on public.committee_members for select using (published and confirmed);
create policy "Admins manage categories" on public.membership_categories for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads published categories" on public.membership_categories for select using (published);
create policy "Public submits membership enquiry" on public.membership_applications for insert with check (status='received' and payment_status='not_started');
create policy "Admins manage applications" on public.membership_applications for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage events" on public.events for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads published events" on public.events for select using (published);
create policy "Admins manage speakers" on public.event_speakers for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads speakers of published events" on public.event_speakers for select using (exists(select 1 from public.events e where e.id=event_id and e.published));
create policy "Admins manage schedule" on public.event_schedule for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads schedule of published events" on public.event_schedule for select using (exists(select 1 from public.events e where e.id=event_id and e.published));
create policy "Admins manage registrations" on public.event_registrations for all using (public.is_admin()) with check (public.is_admin());
create policy "Public registers for free published events" on public.event_registrations for insert with check (
  status='registered' and payment_status='not_required' and exists(
    select 1 from public.events e where e.id=event_id and e.published and e.fee_minor=0
      and (e.registration_opens_at is null or e.registration_opens_at<=now())
      and (e.registration_closes_at is null or e.registration_closes_at>=now())
  )
);
create policy "Admins manage payments" on public.payments for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage publications" on public.publications for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads published publications" on public.publications for select using (published);
create policy "Admins manage resources" on public.resources for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads published resources" on public.resources for select using (published);
create policy "Admins manage albums" on public.gallery_albums for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads published albums" on public.gallery_albums for select using (published);
create policy "Admins manage gallery images" on public.gallery_images for all using (public.is_admin()) with check (public.is_admin());
create policy "Public reads images of published albums" on public.gallery_images for select using (exists(select 1 from public.gallery_albums a where a.id=album_id and a.published));
create policy "Public submits contact message" on public.contact_messages for insert with check (status='new');
create policy "Admins manage contact messages" on public.contact_messages for all using (public.is_admin()) with check (public.is_admin());

revoke all on public.membership_applications,public.event_registrations,public.payments,public.contact_messages from anon,authenticated;
grant insert on public.membership_applications,public.contact_messages to anon,authenticated;
grant insert on public.event_registrations to anon,authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant select on public.events,public.event_speakers,public.event_schedule,public.pages,public.announcements,public.committee_members,public.membership_categories,public.publications,public.resources,public.gallery_albums,public.gallery_images to anon;

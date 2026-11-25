alter table public.event_registrations
  add column if not exists consent_at timestamptz;

create table if not exists public.razorpay_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

alter table public.razorpay_webhook_events enable row level security;
revoke all on public.razorpay_webhook_events from public, anon, authenticated;
grant select, insert, update, delete on public.event_registrations, public.payments, public.razorpay_webhook_events to service_role;

create or replace function public.create_paid_event_registration(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_institution text default null,
  p_designation text default null,
  p_consent boolean default false
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  selected_event public.events%rowtype;
  registration_id uuid;
  existing_registration public.event_registrations%rowtype;
  registered_count integer;
  normalized_email text;
begin
  if coalesce(p_consent,false) is not true then
    raise exception using errcode='22023', message='Consent is required.';
  end if;
  if length(trim(coalesce(p_full_name,''))) not between 1 and 120
     or length(trim(coalesce(p_email,''))) not between 3 and 254
     or trim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(trim(coalesce(p_phone,''))) not between 8 and 24
     or trim(p_phone) !~ '^[+0-9][0-9[:space:]()-]{7,19}$'
     or length(coalesce(p_institution,''))>180
     or length(coalesce(p_designation,''))>120 then
    raise exception using errcode='22023', message='Please check the registration details.';
  end if;

  select * into selected_event
  from public.events
  where id=p_event_id and published
  for update;
  if not found then
    raise exception using errcode='P0001', message='Event not found.';
  end if;
  if selected_event.fee_minor<=0 then
    raise exception using errcode='P0001', message='This event does not require paid registration.';
  end if;
  if selected_event.registration_opens_at is not null and selected_event.registration_opens_at>now() then
    raise exception using errcode='P0001', message='Registration has not opened yet.';
  end if;
  if selected_event.registration_closes_at is not null and selected_event.registration_closes_at<now() then
    raise exception using errcode='P0001', message='Registration has closed.';
  end if;

  normalized_email=lower(trim(p_email));
  select * into existing_registration from public.event_registrations r
  where r.event_id=p_event_id and lower(r.email)=normalized_email and r.status='registered'
  order by r.created_at desc limit 1;
  if found and existing_registration.payment_status='pending' and exists(
    select 1 from public.payments p where p.event_registration_id=existing_registration.id and p.provider='razorpay' and p.status in ('created','pending') and p.provider_order_id is not null
  ) then
    return jsonb_build_object(
      'registration_id',existing_registration.id,
      'amount_minor',selected_event.fee_minor,
      'currency',trim(selected_event.currency),
      'event_title',selected_event.title,
      'existing',true
    );
  end if;
  if found then
    raise exception using errcode='P0001', message='This email already has an active registration for the event.';
  end if;
  if selected_event.capacity is not null then
    select count(*)::integer into registered_count
    from public.event_registrations r
    where r.event_id=p_event_id and r.status='registered';
    if registered_count>=selected_event.capacity then
      raise exception using errcode='P0001', message='Registration is full.';
    end if;
  end if;

  insert into public.event_registrations(event_id,full_name,email,phone,institution,designation,status,payment_status,consent_at)
  values(p_event_id,trim(p_full_name),normalized_email,trim(p_phone),nullif(trim(coalesce(p_institution,'')),''),nullif(trim(coalesce(p_designation,'')),''),'registered','pending',now())
  returning id into registration_id;

  return jsonb_build_object(
    'registration_id',registration_id,
    'amount_minor',selected_event.fee_minor,
    'currency',trim(selected_event.currency),
    'event_title',selected_event.title
  );
end;
$$;

revoke all on function public.create_paid_event_registration(uuid,text,text,text,text,text,boolean) from public, anon, authenticated;
grant execute on function public.create_paid_event_registration(uuid,text,text,text,text,text,boolean) to service_role;

create or replace function public.create_paid_membership_application(
  p_full_name text,
  p_email text,
  p_phone text,
  p_designation text,
  p_institution text,
  p_city text,
  p_category_id uuid,
  p_consent boolean
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  selected_category public.membership_categories%rowtype;
  existing_application public.membership_applications%rowtype;
  application_id uuid;
begin
  if coalesce(p_consent,false) is not true then
    raise exception using errcode='22023', message='Consent is required.';
  end if;
  if length(trim(coalesce(p_full_name,''))) not between 1 and 120
     or length(trim(coalesce(p_email,''))) not between 3 and 254
     or trim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(trim(coalesce(p_phone,''))) not between 8 and 24
     or trim(p_phone) !~ '^[+0-9][0-9[:space:]()-]{7,19}$'
     or length(coalesce(p_designation,''))>120
     or length(coalesce(p_institution,''))>180
     or length(coalesce(p_city,''))>100 then
    raise exception using errcode='22023', message='Please check the application details.';
  end if;

  select * into selected_category
  from public.membership_categories
  where id=p_category_id and published
  for update;
  if not found then
    raise exception using errcode='P0001', message='Please select a current membership category.';
  end if;
  if selected_category.fee_minor is null or selected_category.fee_minor<100 then
    raise exception using errcode='P0001', message='This membership category does not have an approved payable fee.';
  end if;
  if trim(selected_category.currency)<>'INR' then
    raise exception using errcode='P0001', message='Online membership payment is currently configured for INR fees only.';
  end if;

  select * into existing_application
  from public.membership_applications
  where lower(email)=lower(trim(p_email)) and category_id=p_category_id
    and lower(full_name)=lower(trim(p_full_name)) and trim(phone)=trim(p_phone)
    and status in ('received','reviewing','contacted') and payment_status='pending'
  order by created_at desc limit 1;
  if found then
    return jsonb_build_object('application_id',existing_application.id,'amount_minor',selected_category.fee_minor,'currency',trim(selected_category.currency),'category_name',selected_category.name,'existing',true);
  end if;

  insert into public.membership_applications(full_name,email,phone,designation,institution,city,category_id,consent_at,status,payment_status)
  values(trim(p_full_name),lower(trim(p_email)),trim(p_phone),nullif(trim(coalesce(p_designation,'')),''),nullif(trim(coalesce(p_institution,'')),''),nullif(trim(coalesce(p_city,'')),''),p_category_id,now(),'received','pending')
  returning id into application_id;

  return jsonb_build_object('application_id',application_id,'amount_minor',selected_category.fee_minor,'currency',trim(selected_category.currency),'category_name',selected_category.name,'existing',false);
end;
$$;

revoke all on function public.create_paid_membership_application(text,text,text,text,text,text,uuid,boolean) from public, anon, authenticated;
grant execute on function public.create_paid_membership_application(text,text,text,text,text,text,uuid,boolean) to service_role;

drop policy if exists "Public submits membership enquiry" on public.membership_applications;
create policy "Public submits free membership enquiry" on public.membership_applications
for insert with check (
  status='received' and payment_status='not_started'
  and (category_id is null or exists (
    select 1 from public.membership_categories c
    where c.id=category_id and c.published and coalesce(c.fee_minor,0)=0
  ))
);
grant insert on public.membership_applications to anon,authenticated;
grant select,insert,update,delete on public.membership_applications to service_role;

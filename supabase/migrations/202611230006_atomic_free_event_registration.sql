-- Enforce event windows, duplicate protection, and capacity in one transaction.
drop policy if exists "Public registers for free published events" on public.event_registrations;
revoke insert on public.event_registrations from anon, authenticated;
grant insert on public.event_registrations to authenticated;

create or replace function public.register_for_free_event(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_institution text default null,
  p_designation text default null,
  p_consent boolean default false
) returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  selected_event public.events%rowtype;
  registered_count integer;
  registration_id uuid;
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
  if selected_event.fee_minor>0 then
    raise exception using errcode='P0001', message='Paid registration is not enabled.';
  end if;
  if selected_event.registration_opens_at is not null and selected_event.registration_opens_at>now() then
    raise exception using errcode='P0001', message='Registration has not opened yet.';
  end if;
  if selected_event.registration_closes_at is not null and selected_event.registration_closes_at<now() then
    raise exception using errcode='P0001', message='Registration has closed.';
  end if;

  normalized_email=lower(trim(p_email));
  if exists(select 1 from public.event_registrations r where r.event_id=p_event_id and lower(r.email)=normalized_email and r.status='registered') then
    raise exception using errcode='P0001', message='This email is already registered for the event.';
  end if;
  if selected_event.capacity is not null then
    select count(*)::integer into registered_count
    from public.event_registrations r
    where r.event_id=p_event_id and r.status='registered';
    if registered_count>=selected_event.capacity then
      raise exception using errcode='P0001', message='Registration is full.';
    end if;
  end if;

  insert into public.event_registrations(event_id,full_name,email,phone,institution,designation,status,payment_status)
  values(p_event_id,trim(p_full_name),normalized_email,trim(p_phone),nullif(trim(coalesce(p_institution,'')),''),nullif(trim(coalesce(p_designation,'')),''),'registered','not_required')
  returning id into registration_id;
  return registration_id;
end;
$$;

revoke all on function public.register_for_free_event(uuid,text,text,text,text,text,boolean) from public;
grant execute on function public.register_for_free_event(uuid,text,text,text,text,text,boolean) to anon,authenticated;

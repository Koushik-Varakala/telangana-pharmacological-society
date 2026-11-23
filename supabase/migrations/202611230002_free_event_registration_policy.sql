drop policy if exists "Public registers for free published events" on public.event_registrations;
create policy "Public registers for free published events"
on public.event_registrations for insert to anon, authenticated
with check (
  status='registered'
  and payment_status='not_required'
  and exists (
    select 1 from public.events e
    where e.id=event_id and e.published and e.fee_minor=0
      and (e.registration_opens_at is null or e.registration_opens_at<=now())
      and (e.registration_closes_at is null or e.registration_closes_at>=now())
  )
);
grant insert on public.event_registrations to anon,authenticated;

-- Event poster and brochure columns already exist in the initial schema.
-- Add only the organiser field missing from the original event table.
alter table public.events add column if not exists organiser_info text;

drop policy if exists "Public view published Society assets" on storage.objects;
create policy "Public view published Society assets" on storage.objects
for select to anon, authenticated
using (
  bucket_id='society-public-assets' and exists (
    select 1 from public.announcements a where a.image_path=name and a.published
  ) or bucket_id='society-public-assets' and exists (
    select 1 from public.committee_members c where c.photo_path=name and c.published and c.confirmed
  ) or bucket_id='society-public-assets' and exists (
    select 1 from public.publications p where (p.cover_path=name or p.file_path=name) and p.published
  ) or bucket_id='society-public-assets' and exists (
    select 1 from public.resources r where r.file_path=name and r.published
  ) or bucket_id='society-public-assets' and exists (
    select 1 from public.events e where (e.poster_path=name or e.brochure_path=name) and e.published
  )
);

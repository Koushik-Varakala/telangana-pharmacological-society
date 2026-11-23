-- Allow Society-approved images and PDFs in the private asset bucket.
update storage.buckets
set public=false,
    file_size_limit=8388608,
    allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf']
where id='society-public-assets';

drop policy if exists "Public view published Society assets" on storage.objects;
create policy "Public view published Society assets" on storage.objects
for select to anon, authenticated
using (
  bucket_id='society-public-assets' and exists (
    select 1 from public.announcements a
    where a.image_path=name and a.published
  ) or bucket_id='society-public-assets' and exists (
    select 1 from public.committee_members c
    where c.photo_path=name and c.published and c.confirmed
  ) or bucket_id='society-public-assets' and exists (
    select 1 from public.publications p
    where (p.cover_path=name or p.file_path=name) and p.published
  ) or bucket_id='society-public-assets' and exists (
    select 1 from public.resources r
    where r.file_path=name and r.published
  )
);

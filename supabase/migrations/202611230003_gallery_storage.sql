insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('society-public-assets','society-public-assets',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Admins upload Society images" on storage.objects;
create policy "Admins upload Society images" on storage.objects for insert to authenticated
with check (bucket_id='society-public-assets' and public.is_admin());
drop policy if exists "Admins update Society images" on storage.objects;
create policy "Admins update Society images" on storage.objects for update to authenticated
using (bucket_id='society-public-assets' and public.is_admin())
with check (bucket_id='society-public-assets' and public.is_admin());
drop policy if exists "Admins remove Society images" on storage.objects;
create policy "Admins remove Society images" on storage.objects for delete to authenticated
using (bucket_id='society-public-assets' and public.is_admin());
drop policy if exists "Public view published Society images" on storage.objects;
create policy "Public view published Society images" on storage.objects for select to anon,authenticated
using (
  bucket_id='society-public-assets' and exists(
    select 1 from public.gallery_images gi join public.gallery_albums ga on ga.id=gi.album_id
    where gi.file_path=name and ga.published
  )
);

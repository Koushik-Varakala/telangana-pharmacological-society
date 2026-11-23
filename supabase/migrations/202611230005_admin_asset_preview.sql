-- Let administrators preview uploaded assets in the protected admin editor.
drop policy if exists "Admins view Society assets" on storage.objects;
create policy "Admins view Society assets" on storage.objects
for select to authenticated
using (bucket_id='society-public-assets' and public.is_admin());

# Telangana Pharmacological Society website

Next.js App Router project for the Society’s public website and a protected admin foundation.

## Local development

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The public pages and reviewed-content placeholders work without credentials. Membership/contact submissions, dynamic events and admin records need Supabase configuration.

## Supabase setup

1. Create a Supabase project owned by the Society.
2. Copy the project URL and publishable key to `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The app also accepts the older anon key variable for compatibility.
3. Apply the SQL files in `supabase/migrations/` in timestamp order using the Supabase SQL editor or CLI. The second migration adds the free-event registration policy if the initial migration was already applied before that policy was added.
4. Create an administrator in Supabase Auth, then insert that user's UUID into `public.admin_profiles` with role `admin` using a trusted database session.
5. Never expose or use the service-role key in browser code. Do not enable live forms until the Society approves the privacy notice and the database policies have been reviewed.

The admin area is protected by Supabase Auth and an `admin_profiles` role check. Admins can create, update, and publish events, announcements, committee profiles, publications, resources, membership categories, and gallery albums. They can add event speakers/schedules, review registrations and contact messages, update enquiry statuses, export registrations/applications as CSV, and upload private gallery images, content images, and PDF resources to Supabase Storage. Apply migrations `202611230004_published_content_assets.sql` and `202611230005_admin_asset_preview.sql` to enable content asset upload/viewing and administrator previews. Uploaded photos are resized and converted to WebP where supported; PDFs are limited to 8 MB. Apply `202611230006_atomic_free_event_registration.sql` to have the database enforce registration windows, prevent duplicate registrations, and enforce event capacity atomically.

## Payments and notifications

Contact and membership enquiries can notify the configured Society email using Resend. Add a verified sender and Society-controlled recipient before enabling email delivery. Razorpay checkout and signed webhook processing are not implemented, so paid membership and event workflows stay unavailable. Do not add live payment credentials until the Society owns and approves the provider account.

## Content and review

The project brief is not a substitute for the Society's registration certificate or Memorandum of Association. Committee profiles are withheld pending spelling, title and publication approval. The supplied emblem is temporary. Privacy and terms pages are review drafts. No live events, publications, official contact details, membership fees, or office address are invented.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
```
# telangana-pharmacological-society
# telangana-pharmacological-society
# telangana-pharmacological-society

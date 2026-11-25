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
3. Apply the SQL files in `supabase/migrations/` in timestamp order using the Supabase SQL editor or CLI. This includes the paid checkout migration `202611240008_razorpay_event_payments.sql`.
4. Create an administrator in Supabase Auth, then insert that user's UUID into `public.admin_profiles` with role `admin` using a trusted database session.
5. Never expose or use the service-role key in browser code. Production forms remain off by default. Set `PUBLIC_FORMS_ENABLED=true` only after the Society approves the privacy notice and operational arrangements; local development forms remain available.

The admin area is protected by Supabase Auth and an `admin_profiles` role check. Admins can create, update, publish, and delete announcements, committee profiles, publications, and resources. Events can be edited or deleted when they have no registrations; events with registrations can be unpublished while their registration records remain available. Album details and photo captions can be edited, and photos or albums can be removed. Published announcements appear on the homepage and in a public news archive with individual detail pages. An optional announcement expiry date removes it from the homepage after that date while keeping it published in the archive as history. Gallery photos are resized to 1,800 pixels and converted to WebP when supported before upload. Admins can add event speakers/schedules, review registrations and contact messages, update enquiry statuses, export registrations/applications as CSV, and upload private gallery images, content images, and PDF resources to Supabase Storage. Apply migrations `202611230004_published_content_assets.sql` and `202611230005_admin_asset_preview.sql` to enable content asset upload/viewing and administrator previews. Uploaded photos are resized and converted to WebP where supported; PDFs are limited to 8 MB. Apply `202611230006_atomic_free_event_registration.sql` to have the database enforce registration windows, prevent duplicate registrations, and enforce event capacity atomically. Apply `202611230007_announcement_expiry.sql` to add announcement expiry dates.

## Payments and notifications

Contact and membership enquiries can notify the configured Society email using Resend. Add a verified sender and Society-controlled recipient before enabling email delivery. Paid event registration and paid membership application checkout use Razorpay Orders and Checkout, server-side signature verification, and a signed webhook at `/api/payments/razorpay/webhook`. Configure this URL and the same webhook secret in Razorpay. Membership applicants pay at submission; payment does not approve or grant membership, which remains a Society decision. The checkout currently accepts INR fees only. Pending paid event registrations reserve capacity until payment is confirmed or Society administrators reconcile the order in Razorpay and update the registration. Set `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` only in the server environment; use Razorpay test credentials for initial verification. Do not add live payment credentials until the Society owns and approves the provider account. These workflows remain unavailable until the Society's Supabase migration and provider configuration are completed.

## Content and review

The project brief is not a substitute for the Society's registration certificate or Memorandum of Association. Committee profiles are withheld pending spelling, title and publication approval. The supplied emblem is temporary. Privacy and terms pages are review drafts. No live events, publications, official contact details, membership fees, or office address are invented.

Apply `202611240009_event_assets_and_organiser.sql` to add the event organiser information field and allow public signed access to published event posters and brochures. Event poster and brochure uploads use the existing private Society asset bucket and are limited to 8 MB; images are resized where supported. The event test record with slug `test-event` is filtered from all public event listings and its detail URL, but is retained in the database for safe administrator review. Public forms are guarded with a small in-memory per-process rate limit (five submissions per minute per forwarded client address); this is a best-effort abuse check and should be replaced with platform-level rate limiting if the deployment platform provides it.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
```
# telangana-pharmacological-society
# telangana-pharmacological-society
# telangana-pharmacological-society

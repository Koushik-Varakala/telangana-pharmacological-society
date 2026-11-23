# Project guidance

- Stack: Next.js App Router, React, TypeScript, Supabase PostgreSQL/Auth/Storage. Payments and email must stay disabled until Society-owned provider accounts are configured.
- Commands: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`.
- Prefer server components; use client components only for interactions. Keep public content and private admin data in separate access paths.
- Never expose service-role, payment, or email secrets to browser code. Do not publish residential addresses or unconfirmed committee details.
- Validate all submitted data server-side. Keep private application, registration, payment, and message tables behind RLS. Public routes may read only published records.
- Do not claim a payment, email, event, or membership workflow succeeded unless its configured provider or database confirms it.
- Content taken from the project brief remains marked for Society verification until original records or written approval are provided.
- Run lint, type checks, and build before handoff. No live deployment, paid setup, or real charges without explicit approval.

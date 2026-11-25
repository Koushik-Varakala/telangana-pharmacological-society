alter table public.announcements
  add column if not exists expires_on date;

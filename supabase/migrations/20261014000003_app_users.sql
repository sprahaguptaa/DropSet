-- DropSet | Migration 3: app_users (email + salted/hashed password for the Express login routes)
-- The Express server connects to Postgres directly and never exposes this table through the Supabase API.

create table public.app_users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  password_hash  text not null,   -- bcrypt hash (salt included), never the plain password
  created_at     timestamptz not null default now()
);

-- Emails are unique ignoring upper/lower case.
create unique index app_users_email_key on public.app_users (lower(email));

-- Lock the table down: no access through the public Supabase API (anon / signed-in keys).
alter table public.app_users enable row level security;
revoke all on table public.app_users from anon, authenticated;

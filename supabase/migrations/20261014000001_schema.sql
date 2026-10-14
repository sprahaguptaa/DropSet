-- DropSet | Migration 1: extensions, enums, tables, indexes
-- Owner: Database (Sage). Target: Supabase Postgres.

create extension if not exists postgis with schema extensions;

-- ---------- Enums ----------
create type public.pass_type as enum ('day', 'week', 'month');
create type public.pass_status as enum ('inactive', 'active', 'expired', 'cancelled');
create type public.purchase_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type public.price_confidence as enum ('official', 'third_party', 'unverified');

-- ---------- Shared trigger fn ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles (1:1 with Supabase Auth users) ----------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  avatar_url    text,
  home_city     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- Lookups ----------
create table public.training_styles (
  id    smallint generated always as identity primary key,
  slug  text not null unique,
  name  text not null
);

create table public.amenities (
  id    smallint generated always as identity primary key,
  slug  text not null unique,
  name  text not null
);

-- ---------- gyms ----------
-- lat/lng are nullable on purpose: Google restricts caching of Places data,
-- so coordinates get filled in later (Places step) or by our own geocoding.
create table public.gyms (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  description        text,
  address_line1      text,
  city               text not null,
  state              text not null default 'AZ',
  postal_code        text,
  country            text not null default 'US',
  lat                double precision check (lat between -90 and 90),
  lng                double precision check (lng between -180 and 180),
  location           extensions.geography(Point, 4326) generated always as (
                       case when lat is not null and lng is not null
                            then extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
                       end) stored,
  phone              text,
  website_url        text,
  hours              jsonb,
  google_place_id    text unique,            -- allowed to store long-term
  stripe_account_id  text,                   -- stretch: gym payouts (Stripe Connect)
  is_partner         boolean not null default false,
  is_active          boolean not null default true,
  notes              text,                   -- free trials, restrictions, caveats
  data_source        text,                   -- where our data came from
  source_url         text,
  data_verified_at   date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger gyms_updated_at before update on public.gyms
  for each row execute function public.set_updated_at();
create index gyms_location_idx on public.gyms using gist (location);
create index gyms_city_idx on public.gyms (lower(city), state);

create table public.gym_training_styles (
  gym_id    uuid     not null references public.gyms (id) on delete cascade,
  style_id  smallint not null references public.training_styles (id) on delete cascade,
  primary key (gym_id, style_id)
);
create index gym_training_styles_style_idx on public.gym_training_styles (style_id);

create table public.gym_amenities (
  gym_id      uuid     not null references public.gyms (id) on delete cascade,
  amenity_id  smallint not null references public.amenities (id) on delete cascade,
  primary key (gym_id, amenity_id)
);

create table public.gym_photos (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references public.gyms (id) on delete cascade,
  url         text not null,
  caption     text,
  sort_order  int  not null default 0
);
create index gym_photos_gym_idx on public.gym_photos (gym_id, sort_order);

-- ---------- pass_options (what a gym sells) ----------
create table public.pass_options (
  id                uuid primary key default gen_random_uuid(),
  gym_id            uuid not null references public.gyms (id) on delete cascade,
  name              text not null,
  pass_type         public.pass_type not null,
  duration_days     int  not null check (duration_days > 0),
  price_cents       int  not null check (price_cents >= 0),
  currency          text not null default 'usd',
  is_active         boolean not null default true,
  price_confidence  public.price_confidence not null default 'unverified',
  price_source_url  text,
  price_verified_at date,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (gym_id, name)
);
create trigger pass_options_updated_at before update on public.pass_options
  for each row execute function public.set_updated_at();
create index pass_options_gym_idx on public.pass_options (gym_id) where is_active;

-- ---------- purchases ----------
-- Rows are created/updated by the backend (service role) from Stripe events.
create table public.purchases (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles (id) on delete restrict,
  gym_id                    uuid not null references public.gyms (id) on delete restrict,
  pass_option_id            uuid not null references public.pass_options (id) on delete restrict,
  amount_cents              int  not null check (amount_cents >= 0),
  platform_fee_cents        int  not null default 0 check (platform_fee_cents >= 0),
  currency                  text not null default 'usd',
  status                    public.purchase_status not null default 'pending',
  stripe_payment_intent_id  text unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create trigger purchases_updated_at before update on public.purchases
  for each row execute function public.set_updated_at();
create index purchases_user_idx on public.purchases (user_id, created_at desc);

-- ---------- passes (the digital pass / QR) ----------
create table public.passes (
  id            uuid primary key default gen_random_uuid(),
  purchase_id   uuid not null unique references public.purchases (id) on delete restrict,
  user_id       uuid not null references public.profiles (id) on delete restrict,
  gym_id        uuid not null references public.gyms (id) on delete restrict,
  code          text not null unique default replace(gen_random_uuid()::text, '-', ''),  -- value encoded in the QR
  pass_type     public.pass_type not null,
  duration_days int  not null check (duration_days > 0),
  status        public.pass_status not null default 'inactive',
  activated_at  timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger passes_updated_at before update on public.passes
  for each row execute function public.set_updated_at();
create index passes_user_idx on public.passes (user_id, created_at desc);
create index passes_expiry_idx on public.passes (expires_at) where status = 'active';

-- ---------- check_ins ----------
create table public.check_ins (
  id             uuid primary key default gen_random_uuid(),
  pass_id        uuid not null references public.passes (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  gym_id         uuid not null references public.gyms (id) on delete cascade,
  checked_in_at  timestamptz not null default now()
);
create index check_ins_pass_idx on public.check_ins (pass_id);

-- ---------- saved_gyms ----------
create table public.saved_gyms (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  gym_id      uuid not null references public.gyms (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, gym_id)
);

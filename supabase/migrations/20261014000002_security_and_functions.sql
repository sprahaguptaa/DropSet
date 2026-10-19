-- DropSet | Migration 2: row-level security, signup trigger, pass functions, expiry job

-- =====================================================================
-- Row-level security
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.training_styles     enable row level security;
alter table public.amenities           enable row level security;
alter table public.gyms                enable row level security;
alter table public.gym_training_styles enable row level security;
alter table public.gym_amenities       enable row level security;
alter table public.gym_photos          enable row level security;
alter table public.pass_options        enable row level security;
alter table public.purchases           enable row level security;
alter table public.passes              enable row level security;
alter table public.check_ins           enable row level security;
alter table public.saved_gyms          enable row level security;

-- Public catalog: anyone (including logged-out visitors) can read.
create policy "catalog read" on public.training_styles     for select to anon, authenticated using (true);
create policy "catalog read" on public.amenities           for select to anon, authenticated using (true);
create policy "catalog read" on public.gym_training_styles for select to anon, authenticated using (true);
create policy "catalog read" on public.gym_amenities       for select to anon, authenticated using (true);
create policy "catalog read" on public.gym_photos          for select to anon, authenticated using (true);
create policy "active gyms readable" on public.gyms
  for select to anon, authenticated using (is_active);
create policy "active passes readable" on public.pass_options
  for select to anon, authenticated using (is_active);

-- Profiles: a user sees and edits only their own row (row is created by trigger).
create policy "own profile read"   on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Saved gyms: full control over own rows.
create policy "own saved read"   on public.saved_gyms for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own saved insert" on public.saved_gyms for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own saved delete" on public.saved_gyms for delete to authenticated
  using (user_id = (select auth.uid()));

-- Purchases, passes, check-ins: read-only for the owner. All writes go through
-- the backend (service role bypasses RLS) or the security-definer functions below,
-- so a client can never mark itself as paid or extend a pass.
create policy "own purchases read" on public.purchases for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own passes read"    on public.passes    for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own check-ins read" on public.check_ins for select to authenticated
  using (user_id = (select auth.uid()));

-- =====================================================================
-- Auto-create a profile when someone signs up
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- search_gyms: powers Gym Search & Discovery
--   p_lat/p_lng/p_radius_m : distance search (gyms with coordinates)
--   p_city                 : city filter (works before coordinates exist)
--   p_style_slugs          : match ANY of these training styles
--   p_max_price_cents      : cheapest active pass must be <= this
-- Returns one row per gym with distance, cheapest pass, and style list.
-- =====================================================================
create or replace function public.search_gyms(
  p_lat             double precision default null,
  p_lng             double precision default null,
  p_radius_m        double precision default 25000,
  p_city            text             default null,
  p_style_slugs     text[]           default null,
  p_max_price_cents int              default null
)
returns table (
  gym_id               uuid,
  slug                 text,
  name                 text,
  address_line1        text,
  city                 text,
  state                text,
  lat                  double precision,
  lng                  double precision,
  distance_m           double precision,
  min_price_cents      int,
  style_slugs          text[],
  is_partner           boolean
)
language sql
stable
set search_path = ''
as $$
  with pt as (
    select case when p_lat is not null and p_lng is not null
                then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
           end as p
  )
  select
    g.id, g.slug, g.name, g.address_line1, g.city, g.state, g.lat, g.lng,
    case when pt.p is not null and g.location is not null
         then extensions.st_distance(g.location, pt.p) end as distance_m,
    (select min(po.price_cents) from public.pass_options po
      where po.gym_id = g.id and po.is_active)::int as min_price_cents,
    coalesce((select array_agg(ts.slug order by ts.slug)
                from public.gym_training_styles gts
                join public.training_styles ts on ts.id = gts.style_id
               where gts.gym_id = g.id), '{}') as style_slugs,
    g.is_partner
  from public.gyms g
  cross join pt
  where g.is_active
    and (p_city is null or lower(g.city) = lower(p_city))
    and (
      pt.p is null
      or (g.location is not null and extensions.st_dwithin(g.location, pt.p, p_radius_m))
      or (g.location is null and p_city is not null)
    )
    and (p_style_slugs is null or exists (
          select 1 from public.gym_training_styles gts
          join public.training_styles ts on ts.id = gts.style_id
          where gts.gym_id = g.id and ts.slug = any (p_style_slugs)))
    and (p_max_price_cents is null or exists (
          select 1 from public.pass_options po
          where po.gym_id = g.id and po.is_active and po.price_cents <= p_max_price_cents))
  order by distance_m nulls last, g.name;
$$;

grant execute on function public.search_gyms(double precision, double precision, double precision, text, text[], int)
  to anon, authenticated;

-- =====================================================================
-- fulfill_purchase: BACKEND ONLY (Stripe webhook, service role)
-- Marks a purchase as paid and creates the pass. Safe to call twice.
-- =====================================================================
create or replace function public.fulfill_purchase(p_purchase_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase public.purchases;
  v_option   public.pass_options;
  v_pass_id  uuid;
begin
  select * into v_purchase from public.purchases where id = p_purchase_id for update;
  if not found then
    raise exception 'purchase % not found', p_purchase_id;
  end if;

  if v_purchase.status in ('failed', 'refunded') then
    raise exception 'purchase % is %', p_purchase_id, v_purchase.status;
  end if;

  select id into v_pass_id from public.passes where purchase_id = p_purchase_id;
  if v_pass_id is not null then
    return v_pass_id;  -- already fulfilled (webhook retry)
  end if;

  select * into v_option from public.pass_options where id = v_purchase.pass_option_id;

  update public.purchases set status = 'succeeded' where id = p_purchase_id;

  insert into public.passes (purchase_id, user_id, gym_id, pass_type, duration_days)
  values (p_purchase_id, v_purchase.user_id, v_purchase.gym_id, v_option.pass_type, v_option.duration_days)
  returning id into v_pass_id;

  return v_pass_id;
end;
$$;

revoke all on function public.fulfill_purchase(uuid) from public, anon, authenticated;
grant execute on function public.fulfill_purchase(uuid) to service_role;

-- =====================================================================
-- activate_pass: the traveler taps "Activate" on arrival
-- Starts the clock (expires_at = now + duration) and logs a check-in.
-- =====================================================================
create or replace function public.activate_pass(p_pass_id uuid)
returns public.passes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pass public.passes;
begin
  select * into v_pass from public.passes
   where id = p_pass_id and user_id = (select auth.uid()) for update;

  if not found then
    raise exception 'pass not found';
  end if;
  if v_pass.status <> 'inactive' then
    raise exception 'pass is already %', v_pass.status;
  end if;

  update public.passes
     set status = 'active',
         activated_at = now(),
         expires_at = now() + make_interval(days => v_pass.duration_days)
   where id = p_pass_id
   returning * into v_pass;

  insert into public.check_ins (pass_id, user_id, gym_id)
  values (v_pass.id, v_pass.user_id, v_pass.gym_id);

  return v_pass;
end;
$$;

revoke all on function public.activate_pass(uuid) from public, anon;
grant execute on function public.activate_pass(uuid) to authenticated;

-- =====================================================================
-- validate_pass: a gym scans the QR code value and learns if it is good
-- (MVP: any signed-in user can call it; codes are 32 random hex chars.)
-- =====================================================================
create or replace function public.validate_pass(p_code text)
returns table (pass_id uuid, gym_id uuid, status public.pass_status, expires_at timestamptz, is_valid boolean)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, p.gym_id, p.status, p.expires_at,
         (p.status = 'active' and p.expires_at > now()) as is_valid
  from public.passes p
  where p.code = p_code;
$$;

revoke all on function public.validate_pass(text) from public, anon;
grant execute on function public.validate_pass(text) to authenticated;

-- =====================================================================
-- expire_passes: flips overdue active passes to expired
-- =====================================================================
create or replace function public.expire_passes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.passes set status = 'expired'
   where status = 'active' and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_passes() from public, anon, authenticated;
grant execute on function public.expire_passes() to service_role;

-- Run expiry every 5 minutes (pg_cron). Skipped quietly if pg_cron is unavailable.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('expire-passes', '*/5 * * * *', 'select public.expire_passes();');
exception when others then
  raise notice 'pg_cron not enabled, call public.expire_passes() from the backend instead: %', sqlerrm;
end;
$$;

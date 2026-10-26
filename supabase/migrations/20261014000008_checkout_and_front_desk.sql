-- DropSet | Migration 8: demo checkout, front-desk check-in, gym staff.
-- A traveler buys a pass (simulated payment for the demo), gets a ticket with a QR code and an
-- 8-character code, and gym staff scan or type it at /desk. Staff scans are the only way a pass
-- starts and the only source of check-ins, so check-in numbers mean real visits.

-- Who works the front desk at which gym. Managed with SQL until the Phase 6 partner portal.
create table public.gym_staff (
  gym_id      uuid not null references public.gyms (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (gym_id, user_id)
);
create index gym_staff_user_idx on public.gym_staff (user_id);
alter table public.gym_staff enable row level security;
create policy "own staff rows read" on public.gym_staff
  for select to authenticated using (user_id = (select auth.uid()));

-- Demo flags, so demo rows can be found and removed later.
alter table public.pass_options add column is_demo boolean not null default false;
alter table public.gyms add column hours_is_demo boolean not null default false;
alter table public.purchases add column is_demo boolean not null default false;

-- A code staff can type: 8 characters with no look-alikes (no 0/O, 1/I).
create function public.new_short_code() returns text
language sql volatile set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 8);
$$;
revoke all on function public.new_short_code() from public, anon, authenticated;
alter table public.passes add column short_code text unique default public.new_short_code();
alter table public.passes alter column short_code set not null;

alter table public.check_ins add column redeemed_by uuid references public.profiles (id) on delete set null;
create index check_ins_gym_idx on public.check_ins (gym_id, checked_in_at desc);

-- Passes now start when staff scan them, not from the traveler's phone.
revoke execute on function public.activate_pass(uuid) from public, anon, authenticated;
revoke execute on function public.validate_pass(text) from public, anon, authenticated;

-- Simulated payment: records a demo purchase and issues the pass in one step.
create function public.demo_checkout(p_option_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := (select auth.uid());
  v_option   public.pass_options;
  v_purchase uuid;
begin
  if v_user is null then
    raise exception 'sign in to buy a pass' using errcode = '42501';
  end if;
  select * into v_option from public.pass_options where id = p_option_id and is_active;
  if not found then
    raise exception 'pass option not available';
  end if;
  if (select count(*) from public.purchases where user_id = v_user and created_at > now() - interval '1 day') >= 20 then
    raise exception 'daily demo purchase limit reached';
  end if;
  insert into public.purchases (user_id, gym_id, pass_option_id, amount_cents, currency, is_demo)
  values (v_user, v_option.gym_id, v_option.id, v_option.price_cents, v_option.currency, true)
  returning id into v_purchase;
  return public.fulfill_purchase(v_purchase);
end;
$$;
revoke all on function public.demo_checkout(uuid) from public, anon;
grant execute on function public.demo_checkout(uuid) to authenticated;

create function public.is_gym_staff(p_gym_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.gym_staff where gym_id = p_gym_id and user_id = (select auth.uid()));
$$;
revoke all on function public.is_gym_staff(uuid) from public, anon, authenticated;  -- used inside the desk functions only

-- Front desk: scan the QR (full code) or type the short code.
--   inactive -> starts the pass and logs a check-in
--   active   -> logs a check-in (week/month passes), unless already checked in within 12 hours
--   expired / cancelled / not_found -> nothing changes
create function public.desk_check_in(p_gym_id uuid, p_code text)
returns table (
  result         text,
  pass_type      public.pass_type,
  duration_days  int,
  expires_at     timestamptz,
  holder_name    text,
  holder_avatar  text,
  checked_in_at  timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_pass   public.passes;
  v_last   timestamptz;
  v_result text;
begin
  if not public.is_gym_staff(p_gym_id) then
    raise exception 'not staff at this gym' using errcode = '42501';
  end if;

  select * into v_pass from public.passes p
   where p.gym_id = p_gym_id
     and (p.code = lower(btrim(p_code)) or p.short_code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')))
   for update;
  if not found then
    return query select 'not_found'::text, null::public.pass_type, null::int, null::timestamptz, null::text, null::text, null::timestamptz;
    return;
  end if;

  select max(c.checked_in_at) into v_last from public.check_ins c where c.pass_id = v_pass.id;

  if v_pass.status = 'active' and v_pass.expires_at <= now() then
    update public.passes set status = 'expired' where id = v_pass.id returning * into v_pass;
  end if;

  if v_pass.status = 'inactive' then
    update public.passes
       set status = 'active', activated_at = now(), expires_at = now() + make_interval(days => v_pass.duration_days)
     where id = v_pass.id
    returning * into v_pass;
    v_result := 'checked_in';
  elsif v_pass.status = 'active' then
    v_result := case when v_last > now() - interval '12 hours' then 'already_in' else 'checked_in' end;
  else
    v_result := v_pass.status::text;
  end if;

  if v_result = 'checked_in' then
    insert into public.check_ins (pass_id, user_id, gym_id, redeemed_by)
    values (v_pass.id, v_pass.user_id, v_pass.gym_id, (select auth.uid()))
    returning checked_in_at into v_last;
  end if;

  return query
  select v_result, v_pass.pass_type, v_pass.duration_days, v_pass.expires_at,
         coalesce(nullif(split_part(btrim(pr.display_name), ' ', 1), '')
                  || coalesce(' ' || left(nullif(split_part(btrim(pr.display_name), ' ', 2), ''), 1) || '.', ''),
                  'DropSet member'),
         pr.avatar_url, v_last
    from (select 1) one
    left join public.profiles pr on pr.id = v_pass.user_id;
end;
$$;
revoke all on function public.desk_check_in(uuid, text) from public, anon;
grant execute on function public.desk_check_in(uuid, text) to authenticated;

-- What DropSet brought this gym. "Today" uses Arizona time until gyms carry their own time zone.
create function public.desk_stats(p_gym_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today timestamptz := (date_trunc('day', now() at time zone 'America/Phoenix')) at time zone 'America/Phoenix';
  v_out   jsonb;
begin
  if not public.is_gym_staff(p_gym_id) then
    raise exception 'not staff at this gym' using errcode = '42501';
  end if;

  with c as (
    select * from public.check_ins where gym_id = p_gym_id
  ),
  first_visit as (
    select user_id, min(checked_in_at) as first_at from c group by user_id
  ),
  sold as (
    select * from public.purchases
     where gym_id = p_gym_id and status = 'succeeded' and created_at > now() - interval '30 days'
  )
  select jsonb_build_object(
    'today',       (select count(*) from c where checked_in_at >= v_today),
    'week',        (select count(*) from c where checked_in_at > now() - interval '7 days'),
    'month',       (select count(*) from c where checked_in_at > now() - interval '30 days'),
    'visitors',    (select count(distinct user_id) from c where checked_in_at > now() - interval '30 days'),
    'new',         (select count(*) from first_visit where first_at > now() - interval '30 days'),
    'passes_sold', (select count(*) from sold),
    'revenue_cents', (select coalesce(sum(amount_cents), 0) from sold),
    'recent', coalesce((
      select jsonb_agg(r order by r.at desc)
        from (
          select c.checked_in_at as at, p.pass_type,
                 coalesce(nullif(split_part(btrim(pr.display_name), ' ', 1), '')
                          || coalesce(' ' || left(nullif(split_part(btrim(pr.display_name), ' ', 2), ''), 1) || '.', ''),
                          'DropSet member') as name
            from c
            join public.passes p on p.id = c.pass_id
            left join public.profiles pr on pr.id = c.user_id
           order by c.checked_in_at desc
           limit 10
        ) r
    ), '[]'::jsonb)
  ) into v_out;
  return v_out;
end;
$$;
revoke all on function public.desk_stats(uuid) from public, anon;
grant execute on function public.desk_stats(uuid) to authenticated;

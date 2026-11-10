-- DropSet | Migration 10: daily check-in (ROADMAP Phase 2, single-player).
-- A workout is "I trained (or rested) today": one per person per day. It is NOT a pass check-in at a
-- gym's front desk (check_ins) and the two are never mixed. Owner-only for now; Phase 4 adds what
-- followers may see, through database functions only.

-- null until the person answers "Do you train most days?"
alter table public.profiles
  add column training_mode text check (training_mode in ('daily', 'traveler'));

create table public.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  logged_on   date not null,  -- the person's own calendar day, sent by the app
  kind        text not null check (kind in ('lift', 'climb', 'class', 'cardio', 'sport', 'rest')),
  gym_id      uuid references public.gyms (id) on delete set null,
  note        text check (char_length(note) <= 140 and char_length(btrim(note)) >= 1),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, logged_on)
);
create index workouts_user_day_idx on public.workouts (user_id, logged_on desc);
create trigger workouts_updated_at before update on public.workouts
  for each row execute function public.set_updated_at();

-- Today (with a day of slack either way for time zones) or up to a week back, never the future.
-- Keeps streaks honest without blocking "I forgot to log yesterday".
create function public.workouts_check_day() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.logged_on > current_date + 1 or new.logged_on < current_date - 8 then
    raise exception 'workouts can be logged for today or the past week' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger workouts_check_day before insert or update of logged_on on public.workouts
  for each row execute function public.workouts_check_day();

alter table public.workouts enable row level security;
create policy "own workouts read" on public.workouts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own workouts insert" on public.workouts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own workouts update" on public.workouts
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own workouts delete" on public.workouts
  for delete to authenticated using (user_id = (select auth.uid()));

-- Consecutive logged days (rest days count) ending today, or ending yesterday if today isn't logged
-- yet, so a streak never looks broken in the morning. Internal: callers decide who may see it.
create function public.workout_streak(p_user uuid, p_today date) returns int
language sql stable security definer set search_path = '' as $$
  with days as (
    select logged_on from public.workouts where user_id = p_user and logged_on <= p_today
  ),
  anchor as (
    select case when exists (select 1 from days where logged_on = p_today) then p_today
                when exists (select 1 from days where logged_on = p_today - 1) then p_today - 1
           end as d
  ),
  ranked as (
    select d.logged_on, row_number() over (order by d.logged_on desc) as rn
      from days d, anchor a
     where a.d is not null and d.logged_on <= a.d
  )
  select count(*)::int from ranked, anchor where ranked.logged_on = anchor.d - (ranked.rn - 1)::int;
$$;
revoke all on function public.workout_streak(uuid, date) from public, anon, authenticated;

create function public.my_streak(p_today date) returns int
language sql stable security definer set search_path = '' as $$
  select public.workout_streak((select auth.uid()), p_today);
$$;
revoke all on function public.my_streak(date) from public, anon;
grant execute on function public.my_streak(date) to authenticated;

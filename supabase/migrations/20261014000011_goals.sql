-- DropSet | Migration 11: goals (ROADMAP Phase 3).
-- A goal is a target for bodyweight, a lift (squat / bench / deadlift / press) or a climbing grade
-- (V-scale). Entries log progress over time, optionally tied to that day's workout. "Goal hit"
-- (achieved_at) is set only by the database when an entry reaches the target, never by the app,
-- so the feed (Phase 4) can trust it. Owner-only for now.

create table public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  kind          text not null check (kind in ('bodyweight', 'lift', 'climb')),
  lift          text check (lift in ('squat', 'bench', 'deadlift', 'press')),
  unit          text not null check (unit in ('lb', 'kg', 'v')),
  start_value   numeric(6, 1) not null check (start_value >= 0),
  target_value  numeric(6, 1) not null check (target_value >= 0),
  achieved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check ((kind = 'lift') = (lift is not null)),
  check ((kind = 'climb') = (unit = 'v')),
  check (target_value <> start_value),
  check (kind = 'bodyweight' or target_value > start_value),  -- lifts and grades aim up
  check (kind <> 'climb' or (start_value <= 17 and target_value <= 17
                            and start_value = trunc(start_value) and target_value = trunc(target_value))),
  check (kind = 'climb' or (start_value <= 2000 and target_value <= 2000))
);
-- One open goal per lift / bodyweight / climbing at a time; once hit, set the next one.
create unique index goals_one_open_idx on public.goals (user_id, kind, coalesce(lift, '')) where achieved_at is null;
create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

create table public.goal_entries (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references public.goals (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  value       numeric(6, 1) not null check (value >= 0 and value <= 2000),
  logged_on   date not null,
  workout_id  uuid references public.workouts (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index goal_entries_goal_idx on public.goal_entries (goal_id, logged_on desc, created_at desc);

alter table public.goals enable row level security;
create policy "own goals read" on public.goals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own goals insert" on public.goals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own goals update" on public.goals
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own goals delete" on public.goals
  for delete to authenticated using (user_id = (select auth.uid()));

-- The app may say what a goal is, never whether it was hit; goals aren't edited after they're set
-- (delete and set a new one), so a hit always means an entry reached that exact target.
revoke insert, update on public.goals from anon, authenticated;
grant insert (user_id, kind, lift, unit, start_value, target_value) on public.goals to authenticated;

alter table public.goal_entries enable row level security;
create policy "own goal entries read" on public.goal_entries
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own goal entries insert" on public.goal_entries
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid()))
    and (workout_id is null
         or exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))));
create policy "own goal entries delete" on public.goal_entries
  for delete to authenticated using (user_id = (select auth.uid()));
revoke update on public.goal_entries from anon, authenticated;

-- Same day window as workouts: today (time-zone slack) or up to a week back.
create trigger goal_entries_check_day before insert on public.goal_entries
  for each row execute function public.workouts_check_day();

-- Hitting the target (up for lifts/grades, either way for bodyweight) marks the goal achieved once.
create function public.goal_entry_achieve() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.goals g
     set achieved_at = now()
   where g.id = new.goal_id
     and g.achieved_at is null
     and ((g.target_value > g.start_value and new.value >= g.target_value)
       or (g.target_value < g.start_value and new.value <= g.target_value));
  return new;
end;
$$;
revoke all on function public.goal_entry_achieve() from public, anon, authenticated;
create trigger goal_entries_achieve after insert on public.goal_entries
  for each row execute function public.goal_entry_achieve();

-- Entries must fit the goal: whole V grades 0-17 for climbing; a weigh-in within 50% of the starting
-- weight (a dropped digit like "18" must not count as hitting 180).
create function public.goal_entry_validate() returns trigger
language plpgsql set search_path = '' as $$
declare g public.goals;
begin
  select * into g from public.goals where id = new.goal_id;
  if g.kind = 'climb' and (new.value <> trunc(new.value) or new.value > 17) then
    raise exception 'climbing grades are whole numbers from 0 to 17' using errcode = '22023';
  end if;
  if g.kind = 'bodyweight' and (new.value < g.start_value * 0.5 or new.value > g.start_value * 1.5) then
    raise exception 'that weigh-in is too far from your starting weight' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger goal_entries_validate before insert on public.goal_entries
  for each row execute function public.goal_entry_validate();

-- Deleting the entry that hit a goal un-hits it, unless another entry still reaches the target
-- (or a newer open goal of the same kind already exists, in which case it stays hit).
create function public.goal_entry_unachieve() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.goals g
     set achieved_at = null
   where g.id = old.goal_id
     and g.achieved_at is not null
     and not exists (select 1 from public.goal_entries e
                      where e.goal_id = g.id
                        and ((g.target_value > g.start_value and e.value >= g.target_value)
                          or (g.target_value < g.start_value and e.value <= g.target_value)));
  return old;
exception when unique_violation then
  return old;
end;
$$;
revoke all on function public.goal_entry_unachieve() from public, anon, authenticated;
create trigger goal_entries_unachieve after delete on public.goal_entries
  for each row execute function public.goal_entry_unachieve();

-- DropSet | Migration 12: social layer (ROADMAP Phase 4).
-- Public profiles with per-person toggles, follows, a feed, props, nudges, accountability partners,
-- blocks and reports. Other people's data is only ever read through the functions below, which apply
-- every privacy rule in one place:
--   * blocked either way -> you don't exist to each other (no profile, no feed, no search, no follows)
--   * show_checkins off  -> no workouts or streak shown to others
--   * show_goals off     -> no goals or goal hits shown to others
--   * share_gym off      -> workouts shown without the gym (default)
--   * a missed day is only ever shown to an accepted accountability partner

alter table public.profiles
  add column username      text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  add column bio           text check (char_length(bio) <= 160),
  add column share_gym     boolean not null default false,
  add column show_checkins boolean not null default true,
  add column show_goals    boolean not null default true;

-- Anyone can be followed; following needs no approval (public profiles).
create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  followee_id  uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id);

create table public.blocks (
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.user_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reported_id  uuid not null references public.profiles (id) on delete cascade,
  workout_id   uuid references public.workouts (id) on delete set null,
  reason       text check (char_length(reason) <= 300),
  created_at   timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

-- One-tap kudos on a workout or a goal hit.
create table public.props (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  workout_id  uuid references public.workouts (id) on delete cascade,
  goal_id     uuid references public.goals (id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (num_nonnulls(workout_id, goal_id) = 1)
);
create unique index props_workout_idx on public.props (workout_id, user_id) where workout_id is not null;
create unique index props_goal_idx on public.props (goal_id, user_id) where goal_id is not null;

create table public.nudges (
  id          uuid primary key default gen_random_uuid(),
  from_id     uuid not null references public.profiles (id) on delete cascade,
  to_id       uuid not null references public.profiles (id) on delete cascade,
  sent_on     date not null default current_date,
  created_at  timestamptz not null default now(),
  seen_at     timestamptz,
  unique (from_id, to_id, sent_on),
  check (from_id <> to_id)
);
create index nudges_to_idx on public.nudges (to_id, created_at desc);

-- Accountability partners: mutual and opt-in. Stored once per pair (user_a < user_b).
create table public.partners (
  user_a        uuid not null references public.profiles (id) on delete cascade,
  user_b        uuid not null references public.profiles (id) on delete cascade,
  requested_by  uuid not null references public.profiles (id) on delete cascade,
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b),
  check (requested_by in (user_a, user_b))
);
create index partners_b_idx on public.partners (user_b);

-- Row access: people see only their own rows; everything about others goes through functions.
alter table public.follows enable row level security;
create policy "own follows read" on public.follows
  for select to authenticated using ((select auth.uid()) in (follower_id, followee_id));
create policy "unfollow or remove follower" on public.follows
  for delete to authenticated using ((select auth.uid()) in (follower_id, followee_id));
revoke insert, update on public.follows from anon, authenticated;  -- follow() checks blocks

alter table public.blocks enable row level security;
create policy "own blocks read" on public.blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "unblock" on public.blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));
revoke insert, update on public.blocks from anon, authenticated;  -- block() also removes follows

alter table public.user_reports enable row level security;
create policy "report someone" on public.user_reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));

alter table public.props enable row level security;
create policy "own props read" on public.props
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.props from anon, authenticated;  -- toggle_props() checks visibility

alter table public.nudges enable row level security;
create policy "own nudges read" on public.nudges
  for select to authenticated using ((select auth.uid()) in (from_id, to_id));
revoke insert, update, delete on public.nudges from anon, authenticated;  -- nudge() / seen_nudges()

alter table public.partners enable row level security;
create policy "own partners read" on public.partners
  for select to authenticated using ((select auth.uid()) in (user_a, user_b));
revoke insert, update, delete on public.partners from anon, authenticated;  -- partner functions

-- ---------- internal helpers (not callable from the app) ----------

create function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks
                  where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create function public.short_name(p public.profiles) returns text
language sql immutable set search_path = '' as $$
  select coalesce(nullif(btrim(p.display_name), ''), p.username, 'DropSet member');
$$;

-- Workouts of p_user that p_viewer may see, newest first (gym only when shared).
create function public.visible_workouts(p_viewer uuid, p_user uuid, p_limit int)
returns table (id uuid, logged_on date, kind text, note text, gym_name text, gym_slug text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select w.id, w.logged_on, w.kind, w.note,
         case when pr.share_gym or p_viewer = p_user then g.name end,
         case when pr.share_gym or p_viewer = p_user then g.slug end,
         w.created_at
    from public.workouts w
    join public.profiles pr on pr.id = w.user_id
    left join public.gyms g on g.id = w.gym_id
   where w.user_id = p_user
     and (p_viewer = p_user or (pr.show_checkins and not public.is_blocked(p_viewer, p_user)))
   order by w.logged_on desc
   limit p_limit;
$$;

revoke all on function public.is_blocked(uuid, uuid) from public, anon, authenticated;
revoke all on function public.short_name(public.profiles) from public, anon, authenticated;
revoke all on function public.visible_workouts(uuid, uuid, int) from public, anon, authenticated;

-- ---------- people ----------

-- A public profile by username. Returns no row if either person blocked the other.
create function public.get_profile_by_username(p_username text, p_today date)
returns table (
  id uuid, username text, display_name text, avatar_url text, bio text,
  followers int, following int, is_me boolean, i_follow boolean, follows_me boolean, i_blocked boolean,
  show_checkins boolean, show_goals boolean, streak int, workouts jsonb, goals jsonb,
  partner_status text  -- null | 'requested' (I asked) | 'incoming' (they asked) | 'partners'
)
language plpgsql stable security definer set search_path = '' as $
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  p public.profiles;
begin
  if me is null then return; end if;
  select * into p from public.profiles where username = lower(btrim(p_username));
  if not found then return; end if;
  -- Being blocked by them hides them completely; if I blocked them I still see the header (to unblock).
  if exists (select 1 from public.blocks where blocker_id = p.id and blocked_id = me) then return; end if;

  return query
  select p.id, p.username, p.display_name, p.avatar_url, p.bio,
    (select count(*)::int from public.follows f where f.followee_id = p.id),
    (select count(*)::int from public.follows f where f.follower_id = p.id),
    p.id = me,
    exists (select 1 from public.follows f where f.follower_id = me and f.followee_id = p.id),
    exists (select 1 from public.follows f where f.follower_id = p.id and f.followee_id = me),
    exists (select 1 from public.blocks b where b.blocker_id = me and b.blocked_id = p.id),
    p.show_checkins, p.show_goals,
    case when (p.show_checkins or p.id = me) and not public.is_blocked(me, p.id)
         then public.workout_streak(p.id, p_today) end,
    case when not public.is_blocked(me, p.id) then
      (select coalesce(jsonb_agg(to_jsonb(v) order by v.logged_on desc), '[]'::jsonb) from public.visible_workouts(me, p.id, 7) v)
    end,
    case when (p.show_goals or p.id = me) and not public.is_blocked(me, p.id) then
      (select coalesce(jsonb_agg(jsonb_build_object(
                'id', g.id, 'kind', g.kind, 'lift', g.lift, 'unit', g.unit,
                'start_value', g.start_value, 'target_value', g.target_value, 'achieved_at', g.achieved_at,
                'current', case when g.kind = 'bodyweight'
                                then coalesce((select e.value from public.goal_entries e where e.goal_id = g.id
                                                order by e.logged_on desc, e.created_at desc limit 1), g.start_value)
                                else greatest(g.start_value, coalesce((select max(e.value) from public.goal_entries e where e.goal_id = g.id), 0)) end)
              order by g.achieved_at nulls first, g.created_at desc), '[]'::jsonb)
         from public.goals g where g.user_id = p.id)
    end,
    (select case when pa.accepted_at is not null then 'partners'
                 when pa.requested_by = me then 'requested' else 'incoming' end
       from public.partners pa
      where (pa.user_a, pa.user_b) = (least(me, p.id), greatest(me, p.id)));
end;
$$;

-- People by username or name, for "Find people". Hides anyone blocked either way.
create function public.search_people(p_query text)
returns table (id uuid, username text, display_name text, avatar_url text, i_follow boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_url,
         exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.id)
    from public.profiles p
   where (select auth.uid()) is not null
     and p.username is not null
     and p.id <> (select auth.uid())
     and char_length(btrim(p_query)) >= 2
     and (p.username like lower(btrim(p_query)) || '%' or p.display_name ilike '%' || btrim(p_query) || '%')
     and not public.is_blocked((select auth.uid()), p.id)
   order by (p.username = lower(btrim(p_query))) desc, p.username
   limit 20;
$$;

-- Followers or following of someone (by username).
create function public.get_follow_list(p_username text, p_followers boolean)
returns table (id uuid, username text, display_name text, avatar_url text, i_follow boolean)
language sql stable security definer set search_path = '' as $$
  with target as (
    select t.id from public.profiles t
     where t.username = lower(btrim(p_username))
       and (select auth.uid()) is not null
       and not public.is_blocked((select auth.uid()), t.id)
  )
  select p.id, p.username, p.display_name, p.avatar_url,
         exists (select 1 from public.follows x where x.follower_id = (select auth.uid()) and x.followee_id = p.id)
    from target t
    join public.follows f on (case when p_followers then f.followee_id else f.follower_id end) = t.id
    join public.profiles p on p.id = (case when p_followers then f.follower_id else f.followee_id end)
   where p.username is not null
     and not public.is_blocked((select auth.uid()), p.id)
   order by f.created_at desc
   limit 200;
$$;

-- ---------- actions ----------

create function public.follow(p_user uuid, p_follow boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null or p_user = me then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_follow then
    if public.is_blocked(me, p_user) then raise exception 'not allowed' using errcode = '42501'; end if;
    if not exists (select 1 from public.profiles where id = p_user and username is not null) then
      raise exception 'no such person' using errcode = '22023';
    end if;
    insert into public.follows (follower_id, followee_id) values (me, p_user) on conflict do nothing;
  else
    delete from public.follows where follower_id = me and followee_id = p_user;
  end if;
end;
$$;

-- Blocking removes follows and any partnership both ways. Unblocking restores nothing.
create function public.set_block(p_user uuid, p_block boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null or p_user = me then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_block then
    insert into public.blocks (blocker_id, blocked_id) values (me, p_user) on conflict do nothing;
    delete from public.follows where (follower_id, followee_id) in ((me, p_user), (p_user, me));
    delete from public.partners where (user_a, user_b) = (least(me, p_user), greatest(me, p_user));
  else
    delete from public.blocks where blocker_id = me and blocked_id = p_user;
  end if;
end;
$$;

-- Props on a workout or goal hit you're allowed to see. Returns whether you now give props.
create function public.toggle_props(p_workout uuid, p_goal uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); owner uuid; visible boolean;
begin
  if me is null or num_nonnulls(p_workout, p_goal) <> 1 then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_workout is not null then
    select w.user_id, (pr.show_checkins or w.user_id = me) into owner, visible
      from public.workouts w join public.profiles pr on pr.id = w.user_id where w.id = p_workout;
  else
    select g.user_id, (g.achieved_at is not null and (pr.show_goals or g.user_id = me)) into owner, visible
      from public.goals g join public.profiles pr on pr.id = g.user_id where g.id = p_goal;
  end if;
  if owner is null or not visible or public.is_blocked(me, owner) then raise exception 'not allowed' using errcode = '42501'; end if;

  if exists (select 1 from public.props where user_id = me and (workout_id = p_workout or goal_id = p_goal)) then
    delete from public.props where user_id = me and (workout_id = p_workout or goal_id = p_goal);
    return false;
  end if;
  insert into public.props (user_id, workout_id, goal_id) values (me, p_workout, p_goal);
  return true;
end;
$$;

-- A friendly in-app nudge: only between people who follow each other, once a day per pair.
create function public.nudge(p_user uuid, p_today date) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null or p_user = me or public.is_blocked(me, p_user)
     or not exists (select 1 from public.follows where follower_id = me and followee_id = p_user)
     or not exists (select 1 from public.follows where follower_id = p_user and followee_id = me) then
    raise exception 'you can nudge people who follow you back' using errcode = '42501';
  end if;
  insert into public.nudges (from_id, to_id, sent_on) values (me, p_user, p_today) on conflict do nothing;
end;
$$;

-- Unseen nudges for me (from people I'm not blocking), then mark them seen.
create function public.take_nudges()
returns table (from_username text, from_name text, from_avatar text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $
#variable_conflict use_column
declare me uuid := (select auth.uid());
begin
  if me is null then return; end if;
  return query
  select p.username, public.short_name(p), p.avatar_url, n.created_at
    from public.nudges n join public.profiles p on p.id = n.from_id
   where n.to_id = me and n.seen_at is null and not public.is_blocked(me, n.from_id)
   order by n.created_at desc
   limit 10;
  update public.nudges set seen_at = now() where to_id = me and seen_at is null;
end;
$$;

-- Ask, accept, or end an accountability partnership (needs a mutual follow to ask).
create function public.set_partner(p_user uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); a uuid := least(me, p_user); b uuid := greatest(me, p_user); pair public.partners;
begin
  if me is null or p_user = me or public.is_blocked(me, p_user) then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into pair from public.partners where user_a = a and user_b = b;
  if p_action = 'ask' then
    if not exists (select 1 from public.follows where follower_id = me and followee_id = p_user)
       or not exists (select 1 from public.follows where follower_id = p_user and followee_id = me) then
      raise exception 'partners need to follow each other' using errcode = '42501';
    end if;
    if pair.user_a is null then
      insert into public.partners (user_a, user_b, requested_by) values (a, b, me);
    elsif pair.accepted_at is null and pair.requested_by <> me then
      update public.partners set accepted_at = now() where user_a = a and user_b = b;  -- both asked: accept
    end if;
  elsif p_action = 'accept' then
    update public.partners set accepted_at = now()
     where user_a = a and user_b = b and accepted_at is null and requested_by <> me;
  elsif p_action = 'end' then
    delete from public.partners where user_a = a and user_b = b;
  else
    raise exception 'unknown action' using errcode = '22023';
  end if;
end;
$$;

-- My partners (and requests), with the one thing only partners see: whether they logged yesterday.
create function public.my_partners(p_today date)
returns table (id uuid, username text, display_name text, avatar_url text, status text,
               streak int, logged_today boolean, missed_yesterday boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_url,
         case when pa.accepted_at is not null then 'partners'
              when pa.requested_by = (select auth.uid()) then 'requested' else 'incoming' end,
         case when pa.accepted_at is not null then public.workout_streak(p.id, p_today) end,
         case when pa.accepted_at is not null then exists (select 1 from public.workouts w where w.user_id = p.id and w.logged_on = p_today) end,
         case when pa.accepted_at is not null then not exists (select 1 from public.workouts w where w.user_id = p.id and w.logged_on = p_today - 1) end
    from public.partners pa
    join public.profiles p on p.id = case when pa.user_a = (select auth.uid()) then pa.user_b else pa.user_a end
   where (select auth.uid()) in (pa.user_a, pa.user_b)
     and not public.is_blocked((select auth.uid()), p.id)
   order by pa.accepted_at nulls first, p.username;
$$;

-- ---------- feed ----------

-- Check-ins and goal hits from me and the people I follow, newest first, with every toggle applied.
create function public.get_feed(p_before timestamptz default null, p_limit int default 30)
returns table (
  item_type text, item_id uuid, at timestamptz, user_id uuid, username text, display_name text, avatar_url text,
  logged_on date, kind text, note text, gym_name text, gym_slug text,
  goal_kind text, goal_lift text, goal_unit text, goal_target numeric,
  props int, i_propped boolean
)
language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) as id),
  authors as (
    select f.followee_id as id from public.follows f, me where f.follower_id = me.id
    union select me.id from me where me.id is not null
  ),
  visible as (
    select a.id from authors a, me where not public.is_blocked(me.id, a.id)
  ),
  items as (
    select 'workout'::text as item_type, w.id as item_id, w.created_at as at, w.user_id,
           w.logged_on, w.kind, w.note,
           case when pr.share_gym or w.user_id = me.id then g.name end as gym_name,
           case when pr.share_gym or w.user_id = me.id then g.slug end as gym_slug,
           null::text as goal_kind, null::text as goal_lift, null::text as goal_unit, null::numeric as goal_target
      from public.workouts w
      join visible v on v.id = w.user_id
      join public.profiles pr on pr.id = w.user_id
      left join public.gyms g on g.id = w.gym_id, me
     where pr.show_checkins or w.user_id = me.id
    union all
    select 'goal_hit', gl.id, gl.achieved_at, gl.user_id,
           null, null, null, null, null,
           gl.kind, gl.lift, gl.unit, gl.target_value
      from public.goals gl
      join visible v on v.id = gl.user_id
      join public.profiles pr on pr.id = gl.user_id, me
     where gl.achieved_at is not null and (pr.show_goals or gl.user_id = me.id)
  )
  select i.item_type, i.item_id, i.at, i.user_id, p.username, p.display_name, p.avatar_url,
         i.logged_on, i.kind, i.note, i.gym_name, i.gym_slug,
         i.goal_kind, i.goal_lift, i.goal_unit, i.goal_target,
         (select count(*)::int from public.props x
           where (case when i.item_type = 'workout' then x.workout_id else x.goal_id end) = i.item_id
             and not public.is_blocked((select id from me), x.user_id)),
         exists (select 1 from public.props x, me
                  where x.user_id = me.id and (case when i.item_type = 'workout' then x.workout_id else x.goal_id end) = i.item_id)
    from items i
    join public.profiles p on p.id = i.user_id
   where p_before is null or i.at < p_before
   order by i.at desc
   limit least(greatest(p_limit, 1), 50);
$$;

-- What the app may call (signed in only).
do $$
declare f text;
begin
  foreach f in array array[
    'public.get_profile_by_username(text, date)', 'public.search_people(text)', 'public.get_follow_list(text, boolean)',
    'public.follow(uuid, boolean)', 'public.set_block(uuid, boolean)', 'public.toggle_props(uuid, uuid)',
    'public.nudge(uuid, date)', 'public.take_nudges()', 'public.set_partner(uuid, text)', 'public.my_partners(date)',
    'public.get_feed(timestamptz, int)']
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ---------- hardening (from an adversarial review of the above) ----------

-- Days come from the app (local calendars); never trust one more than a day from the server's.
create function public.safe_day(p date) returns date
language sql stable set search_path = '' as $$
  select least(greatest(coalesce(p, current_date), current_date - 1), current_date + 1);
$$;
revoke all on function public.safe_day(date) from public, anon, authenticated;

-- Who owns a workout (for report checks; reporters can't read others' workouts directly).
create function public.workout_owner(p_workout uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select user_id from public.workouts where id = p_workout;
$$;
create function public.reports_today(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.user_reports where reporter_id = p_user and created_at > now() - interval '1 day';
$$;
revoke all on function public.workout_owner(uuid) from public, anon;
revoke all on function public.reports_today(uuid) from public, anon;
grant execute on function public.workout_owner(uuid), public.reports_today(uuid) to authenticated;

-- Timestamps are the server's: the feed orders by created_at, so nobody can pin a post to the top.
revoke insert, update on public.workouts from anon, authenticated;
grant insert (user_id, logged_on, kind, gym_id, note) on public.workouts to authenticated;
grant update (user_id, logged_on, kind, gym_id, note) on public.workouts to authenticated;
revoke insert on public.goal_entries from anon, authenticated;
grant insert (goal_id, user_id, value, logged_on, workout_id) on public.goal_entries to authenticated;
revoke insert, update on public.gym_reviews from anon, authenticated;
grant insert (gym_id, user_id, rating, body) on public.gym_reviews to authenticated;
grant update (gym_id, user_id, rating, body) on public.gym_reviews to authenticated;
revoke insert on public.user_reports from anon, authenticated;
grant insert (reporter_id, reported_id, workout_id, reason) on public.user_reports to authenticated;

-- Reviews are read through gym_reviews_for() ("First L." authors); the raw table no longer exposes
-- who wrote what to everyone.
drop policy "reviews readable" on public.gym_reviews;
create policy "own reviews read" on public.gym_reviews
  for select to authenticated using (user_id = (select auth.uid()));

-- Reports: about a workout that belongs to the person reported, at most 20 a day per reporter.
drop policy "report someone" on public.user_reports;
create policy "report someone" on public.user_reports
  for insert to authenticated with check (
    reporter_id = (select auth.uid())
    and (workout_id is null or public.workout_owner(workout_id) = reported_id)
    and public.reports_today((select auth.uid())) < 20);

-- At most 10 new goals a day (stops farming "goal hits" into followers' feeds).
create function public.goals_today(p_user uuid) returns int
language sql stable security definer set search_path = '' as $
  select count(*)::int from public.goals where user_id = p_user and created_at > now() - interval '1 day';
$;
revoke all on function public.goals_today(uuid) from public, anon;
grant execute on function public.goals_today(uuid) to authenticated;
drop policy "own goals insert" on public.goals;
create policy "own goals insert" on public.goals
  for insert to authenticated with check (user_id = (select auth.uid()) and public.goals_today((select auth.uid())) < 10);

-- Nudges are only read through take_nudges() (no read receipts for senders, nothing across a block).
drop policy "own nudges read" on public.nudges;

-- Names stay short and photos come only from our storage (or Google sign-in), so a profile can't
-- push huge text or a tracking image to everyone who sees it.
alter table public.profiles
  add constraint profiles_display_name_len check (char_length(display_name) <= 50),
  add constraint profiles_avatar_host check (
    avatar_url is null
    or avatar_url like 'https://bcskupguftgwjcpkvnoo.supabase.co/storage/v1/object/public/avatars/%'
    or avatar_url like 'https://lh3.googleusercontent.com/%');

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pic text := new.raw_user_meta_data ->> 'avatar_url';
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), 50),
    case when pic like 'https://lh3.googleusercontent.com/%' then pic end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Nobody but the owner role needs TRUNCATE / TRIGGER / REFERENCES on app tables.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t);
  end loop;
end $$;

create or replace function public.follow(p_user uuid, p_follow boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if p_follow then
    -- One answer for every refusal, so it can't be used to learn that someone blocked you.
    if me is null or p_user = me or public.is_blocked(me, p_user)
       or not exists (select 1 from public.profiles where id = p_user and username is not null) then
      raise exception 'not allowed' using errcode = '42501';
    end if;
    insert into public.follows (follower_id, followee_id) values (me, p_user) on conflict do nothing;
  else
    delete from public.follows where follower_id = me and followee_id = p_user;
  end if;
end;
$$;

create or replace function public.set_block(p_user uuid, p_block boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null or p_user = me then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_block then
    insert into public.blocks (blocker_id, blocked_id) values (me, p_user) on conflict do nothing;
    delete from public.follows where (follower_id, followee_id) in ((me, p_user), (p_user, me));
    delete from public.partners where (user_a, user_b) = (least(me, p_user), greatest(me, p_user));
    delete from public.nudges where (from_id, to_id) in ((me, p_user), (p_user, me));
  else
    delete from public.blocks where blocker_id = me and blocked_id = p_user;
  end if;
end;
$$;

create or replace function public.toggle_props(p_workout uuid, p_goal uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); owner uuid; visible boolean;
begin
  if me is null or num_nonnulls(p_workout, p_goal) <> 1 then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_workout is not null then
    select w.user_id, pr.show_checkins into owner, visible
      from public.workouts w join public.profiles pr on pr.id = w.user_id where w.id = p_workout;
  else
    select g.user_id, (g.achieved_at is not null and pr.show_goals) into owner, visible
      from public.goals g join public.profiles pr on pr.id = g.user_id where g.id = p_goal;
  end if;
  -- No props for your own posts, hidden posts, or across a block.
  if owner is null or owner = me or not visible or public.is_blocked(me, owner) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if exists (select 1 from public.props where user_id = me and (workout_id = p_workout or goal_id = p_goal)) then
    delete from public.props where user_id = me and (workout_id = p_workout or goal_id = p_goal);
    return false;
  end if;
  insert into public.props (user_id, workout_id, goal_id) values (me, p_workout, p_goal);
  return true;
end;
$$;

create or replace function public.nudge(p_user uuid, p_today date) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null or p_user = me or public.is_blocked(me, p_user)
     or not exists (select 1 from public.follows where follower_id = me and followee_id = p_user)
     or not exists (select 1 from public.follows where follower_id = p_user and followee_id = me) then
    raise exception 'you can nudge people who follow you back' using errcode = '42501';
  end if;
  -- One per pair per (server-checked) day.
  insert into public.nudges (from_id, to_id, sent_on) values (me, p_user, public.safe_day(p_today)) on conflict do nothing;
end;
$$;

create or replace function public.set_partner(p_user uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); a uuid := least(me, p_user); b uuid := greatest(me, p_user); pair public.partners;
begin
  if me is null or p_user = me or public.is_blocked(me, p_user) then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into pair from public.partners where user_a = a and user_b = b;
  if p_action = 'ask' then
    if not exists (select 1 from public.follows where follower_id = me and followee_id = p_user)
       or not exists (select 1 from public.follows where follower_id = p_user and followee_id = me) then
      raise exception 'not allowed' using errcode = '42501';
    end if;
    if pair.user_a is null then
      insert into public.partners (user_a, user_b, requested_by) values (a, b, me);
    elsif pair.accepted_at is null and pair.requested_by <> me then
      update public.partners set accepted_at = now() where user_a = a and user_b = b;
    end if;
  elsif p_action = 'accept' then
    update public.partners set accepted_at = now()
     where user_a = a and user_b = b and accepted_at is null and requested_by <> me;
  elsif p_action = 'end' then
    delete from public.partners where user_a = a and user_b = b;
  else
    raise exception 'unknown action' using errcode = '22023';
  end if;
end;
$$;

-- Partners see today and yesterday only: the day is clamped, so past calendars can't be rebuilt.
create or replace function public.my_partners(p_today date)
returns table (id uuid, username text, display_name text, avatar_url text, status text,
               streak int, logged_today boolean, missed_yesterday boolean)
language sql stable security definer set search_path = '' as $$
  with d as (select public.safe_day(p_today) as day)
  select p.id, p.username, p.display_name, p.avatar_url,
         case when pa.accepted_at is not null then 'partners'
              when pa.requested_by = (select auth.uid()) then 'requested' else 'incoming' end,
         case when pa.accepted_at is not null and p.show_checkins then public.workout_streak(p.id, d.day) end,
         case when pa.accepted_at is not null then exists (select 1 from public.workouts w where w.user_id = p.id and w.logged_on = d.day) end,
         case when pa.accepted_at is not null then not exists (select 1 from public.workouts w where w.user_id = p.id and w.logged_on = d.day - 1) end
    from public.partners pa
    cross join d
    join public.profiles p on p.id = case when pa.user_a = (select auth.uid()) then pa.user_b else pa.user_a end
   where (select auth.uid()) in (pa.user_a, pa.user_b)
     and not public.is_blocked((select auth.uid()), p.id)
   order by pa.accepted_at nulls first, p.username;
$$;

-- Search by plain text (no LIKE wildcards: "%" or "_" mean themselves).
create or replace function public.search_people(p_query text)
returns table (id uuid, username text, display_name text, avatar_url text, i_follow boolean)
language sql stable security definer set search_path = '' as $$
  with q as (select lower(btrim(p_query)) as s)
  select p.id, p.username, p.display_name, p.avatar_url,
         exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.id)
    from public.profiles p, q
   where (select auth.uid()) is not null
     and p.username is not null
     and p.id <> (select auth.uid())
     and char_length(q.s) >= 2
     and (starts_with(p.username, q.s) or strpos(lower(coalesce(p.display_name, '')), q.s) > 0)
     and not public.is_blocked((select auth.uid()), p.id)
   order by (p.username = q.s) desc, p.username
   limit 20;
$$;

-- Profile: day clamped (the streak can't be replayed for past dates), counts match the visible
-- lists (people you're blocked with aren't counted), at most 20 goals.
create or replace function public.get_profile_by_username(p_username text, p_today date)
returns table (
  id uuid, username text, display_name text, avatar_url text, bio text,
  followers int, following int, is_me boolean, i_follow boolean, follows_me boolean, i_blocked boolean,
  show_checkins boolean, show_goals boolean, streak int, workouts jsonb, goals jsonb,
  partner_status text
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  p public.profiles;
  day date := public.safe_day(p_today);
begin
  if me is null then return; end if;
  select * into p from public.profiles where username = lower(btrim(p_username));
  if not found then return; end if;
  if exists (select 1 from public.blocks where blocker_id = p.id and blocked_id = me) then return; end if;

  return query
  select p.id, p.username, p.display_name, p.avatar_url, p.bio,
    (select count(*)::int from public.follows f where f.followee_id = p.id and not public.is_blocked(me, f.follower_id)),
    (select count(*)::int from public.follows f where f.follower_id = p.id and not public.is_blocked(me, f.followee_id)),
    p.id = me,
    exists (select 1 from public.follows f where f.follower_id = me and f.followee_id = p.id),
    exists (select 1 from public.follows f where f.follower_id = p.id and f.followee_id = me),
    exists (select 1 from public.blocks b where b.blocker_id = me and b.blocked_id = p.id),
    p.show_checkins, p.show_goals,
    case when (p.show_checkins or p.id = me) and not public.is_blocked(me, p.id)
         then public.workout_streak(p.id, day) end,
    case when not public.is_blocked(me, p.id) then
      (select coalesce(jsonb_agg(to_jsonb(v) order by v.logged_on desc), '[]'::jsonb) from public.visible_workouts(me, p.id, 7) v)
    end,
    case when (p.show_goals or p.id = me) and not public.is_blocked(me, p.id) then
      (select coalesce(jsonb_agg(x.goal order by x.achieved_at nulls first, x.created_at desc), '[]'::jsonb)
         from (select g.achieved_at, g.created_at, jsonb_build_object(
                  'id', g.id, 'kind', g.kind, 'lift', g.lift, 'unit', g.unit,
                  'start_value', g.start_value, 'target_value', g.target_value, 'achieved_at', g.achieved_at,
                  'current', case when g.kind = 'bodyweight'
                                  then coalesce((select e.value from public.goal_entries e where e.goal_id = g.id
                                                  order by e.logged_on desc, e.created_at desc limit 1), g.start_value)
                                  else greatest(g.start_value, coalesce((select max(e.value) from public.goal_entries e where e.goal_id = g.id), 0)) end) as goal
                 from public.goals g where g.user_id = p.id
                order by g.achieved_at nulls first, g.created_at desc
                limit 20) x)
    end,
    (select case when pa.accepted_at is not null then 'partners'
                 when pa.requested_by = me then 'requested' else 'incoming' end
       from public.partners pa
      where (pa.user_a, pa.user_b) = (least(me, p.id), greatest(me, p.id)));
end;
$$;

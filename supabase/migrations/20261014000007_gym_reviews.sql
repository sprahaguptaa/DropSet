-- DropSet | Migration 7: gym reviews with a 1-5 dumbbell rating.
-- One review per person per gym, 40 words max. Placeholder reviews (is_sample) have no author,
-- are always labeled "Sample review" in the app (the rating says how many are samples), and stop
-- showing once that gym has 3 real reviews. Remove them all with:
--   delete from public.gym_reviews where is_sample;

create table public.gym_reviews (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references public.gyms (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  body        text not null check (
                char_length(btrim(body)) between 1 and 300
                and array_length(regexp_split_to_array(btrim(body), '\s+'), 1) <= 40),
  is_sample   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (gym_id, user_id),
  check (is_sample or user_id is not null)
);
create trigger gym_reviews_updated_at before update on public.gym_reviews
  for each row execute function public.set_updated_at();
create index gym_reviews_gym_idx on public.gym_reviews (gym_id, created_at desc);

alter table public.gym_reviews enable row level security;

create policy "reviews readable" on public.gym_reviews
  for select to anon, authenticated using (true);
create policy "own review insert" on public.gym_reviews
  for insert to authenticated with check (user_id = (select auth.uid()) and not is_sample);
create policy "own review update" on public.gym_reviews
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and not is_sample);
create policy "own review delete" on public.gym_reviews
  for delete to authenticated using (user_id = (select auth.uid()));

-- Reports (App Store requires a way to report user content). Write-only for users.
create table public.review_reports (
  review_id    uuid not null references public.gym_reviews (id) on delete cascade,
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reason       text check (char_length(reason) <= 300),
  created_at   timestamptz not null default now(),
  primary key (review_id, reporter_id)
);
alter table public.review_reports enable row level security;
create policy "report a review" on public.review_reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));

-- Reviews for one gym with each author shown as "First L." + photo (profiles are otherwise private).
create or replace function public.gym_reviews_for(p_gym_id uuid)
returns table (
  id            uuid,
  rating        smallint,
  body          text,
  is_sample     boolean,
  created_at    timestamptz,
  author_name   text,
  author_avatar text,
  is_mine       boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with real_reviews as (
    select count(*) as n from public.gym_reviews where gym_id = p_gym_id and not is_sample
  )
  select
    r.id, r.rating, r.body, r.is_sample, r.created_at,
    case when r.is_sample then null
         else coalesce(
           nullif(split_part(btrim(p.display_name), ' ', 1), '')
             || coalesce(' ' || left(nullif(split_part(btrim(p.display_name), ' ', 2), ''), 1) || '.', ''),
           'DropSet member')
    end,
    case when r.is_sample then null else p.avatar_url end,
    coalesce(r.user_id = (select auth.uid()), false)
  from public.gym_reviews r
  left join public.profiles p on p.id = r.user_id
  cross join real_reviews
  where r.gym_id = p_gym_id
    and (not r.is_sample or real_reviews.n < 3)
  order by r.is_sample, r.created_at desc;
$$;

grant execute on function public.gym_reviews_for(uuid) to anon, authenticated;

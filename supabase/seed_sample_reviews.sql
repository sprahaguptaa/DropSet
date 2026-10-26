-- DropSet | seed_sample_reviews.sql: 3 placeholder reviews per active gym (re-runnable).
-- They are labeled "Sample review" in the app, have no author, never count toward a gym's rating,
-- and hide once a gym has 3 real reviews. They only use data we actually have: the gym's training
-- style, amenities and verified day-pass price. No invented claims about staff, cleanliness, etc.
-- Remove them all with:  delete from public.gym_reviews where is_sample;

delete from public.gym_reviews where is_sample;

with t as (
  select $tpl${
    "openers": {
      "climbing": ["Fun bouldering stop on a trip to {city}.", "Good variety of routes for a quick climbing session.", "Easy place to get some climbing in while traveling.", "The walls kept me busy for a solid two hours."],
      "crossfit": ["Dropped into a class while visiting {city}.", "Solid box for a drop-in workout on the road.", "The class pace was tough in a good way.", "Good spot to keep up my WODs while traveling."],
      "powerlifting": ["Got a heavy squat day in while visiting {city}.", "Plenty of room for barbell work on a travel day.", "Good spot to keep my lifting on track away from home.", "Had what I needed for a full powerlifting session."],
      "olympic_weightlifting": ["Got a snatch and clean session in while in {city}.", "Good place for Olympic lifting on the road.", "Made my weightlifting day easy while traveling."],
      "bodybuilding": ["Great pump session while visiting {city}.", "Plenty to work with for a hypertrophy day.", "Good spot to keep up my split while traveling."],
      "functional_training": ["Good space for conditioning work while in {city}.", "Solid spot for a functional training session on the road.", "Plenty of room for my conditioning day."],
      "group_fitness": ["Jumped into a class while visiting {city}.", "Fun class format and easy to join as a visitor.", "Good way to stay on track with a class while traveling."],
      "recovery_wellness": ["Nice place to train and recover while in {city}.", "Good mix of training and recovery on a travel day.", "Easy way to keep my routine going on a trip."],
      "general_fitness": ["Easy stop for a full workout while visiting {city}.", "Covered the basics I needed on a travel day.", "Good all-around gym for keeping my routine going.", "Convenient spot to get a workout in around {city}."]
    },
    "amenities": {
      "free_weights": "plenty of free weights", "olympic_platforms": "lifting platforms", "cardio": "a cardio area",
      "showers": "showers", "lockers": "lockers", "sauna": "a sauna", "steam_room": "a steam room",
      "cold_plunge": "a cold plunge", "pool": "a pool", "childcare": "childcare", "towel_service": "towel service",
      "group_classes": "group classes", "gear_rental": "gear rental", "courts": "courts",
      "personal_training": "coaches on hand", "recovery": "a recovery area"
    },
    "details": ["Check their hours before you go.", "Worth asking about visitor rules at the desk.", "Bring an ID for check-in."],
    "closers": ["Would come back next trip.", "I'd recommend it to anyone passing through.", "Worth it for a travel day.", "Will stop by again when I'm in town.", "Good find."]
  }$tpl$::jsonb as tpl
),
base as (
  select
    g.id,
    g.city,
    abs(hashtext(g.id::text)::bigint) as hb,
    coalesce((select ts.slug from public.gym_training_styles gts
                join public.training_styles ts on ts.id = gts.style_id
               where gts.gym_id = g.id and ts.slug <> 'general_fitness'
               order by ts.slug limit 1), 'general_fitness') as style,
    (select a.slug from public.gym_amenities ga join public.amenities a on a.id = ga.amenity_id
      where ga.gym_id = g.id and a.slug <> 'open_24_hours' order by a.slug limit 1) as amenity,
    exists (select 1 from public.gym_amenities ga join public.amenities a on a.id = ga.amenity_id
             where ga.gym_id = g.id and a.slug = 'open_24_hours') as open24,
    (select min(po.price_cents) from public.pass_options po
      where po.gym_id = g.id and po.is_active and po.pass_type = 'day') as day_cents
  from public.gyms g
  where g.is_active
),
r as (
  select b.*, n, abs(hashtext(b.id::text || n::text)::bigint) as h
  from base b cross join generate_series(1, 3) as n
)
insert into public.gym_reviews (gym_id, rating, body, is_sample, created_at)
select
  r.id,
  case when r.h % 10 = 0 then 3 when r.h % 10 < 5 then 4 else 5 end,
  replace(t.tpl -> 'openers' -> r.style ->> ((r.hb + r.n) % jsonb_array_length(t.tpl -> 'openers' -> r.style))::int,
          '{city}', r.city)
  || ' ' ||
  case
    when r.n = 1 and r.day_cents is not null then
      'Day pass was $' || case when r.day_cents % 100 = 0 then (r.day_cents / 100)::text
                               else to_char(r.day_cents / 100.0, 'FM999990.00') end || ', which felt fair.'
    when r.n = 2 and r.open24 then 'Being open 24 hours worked with my flight times.'
    when r.n <= 2 and r.amenity is not null then 'Nice that it has ' || (t.tpl -> 'amenities' ->> r.amenity) || '.'
    else t.tpl -> 'details' ->> ((r.hb + r.n) % jsonb_array_length(t.tpl -> 'details'))::int
  end
  || ' ' ||
  (t.tpl -> 'closers' ->> ((r.hb + r.n * 2) % jsonb_array_length(t.tpl -> 'closers'))::int),
  true,
  now() - make_interval(days => (r.h % 90)::int, hours => (r.h % 24)::int)
from r cross join t;

-- DropSet | seed_demo_data.sql: demo pass prices, hours and front-desk staff for the class demo (re-runnable).
-- Only fills gyms that have no real price / no real hours. Prices are typical for the gym type, not the
-- gym's actual rate. Every demo row is flagged and the gym page shows a footnote.
--
-- Hide demo prices (keeps passes already sold):  update public.pass_options set is_active = false where is_demo;
-- Remove demo hours:                             update public.gyms set hours = null, hours_is_demo = false where hours_is_demo;
-- Make someone staff at a gym:
--   insert into public.gym_staff (gym_id, user_id)
--   select g.id, u.id from public.gyms g, auth.users u where g.slug = 'camelback-crossfit' and u.email = 'name@example.com';

delete from public.pass_options o
 where o.is_demo and not exists (select 1 from public.purchases p where p.pass_option_id = o.id);
update public.gyms set hours = null, hours_is_demo = false where hours_is_demo;

create temp table demo_gyms as
select
  g.id,
  g.name,
  abs(hashtext(g.id::text)) as h,
  g.name ~* 'planet fitness|la fitness|crunch|anytime|vasa|eos fitness|chuckwalla|mountainside|track club|life ?time|milan|athletic club|orangetheory|f45' as chain,
  coalesce((select ts.slug from public.gym_training_styles gts
              join public.training_styles ts on ts.id = gts.style_id
             where gts.gym_id = g.id and ts.slug <> 'general_fitness'
             order by ts.slug limit 1), 'general_fitness') as style,
  exists (select 1 from public.gym_amenities ga join public.amenities a on a.id = ga.amenity_id
           where ga.gym_id = g.id and a.slug = 'open_24_hours') as open24
from public.gyms g
where g.is_active;

-- Prices
with priced as (
  select d.*,
    case when d.name ~* 'orangetheory|f45' or d.style in ('crossfit', 'group_fitness') then 'Drop-in class' else 'Day pass' end as day_name,
    case
      when d.name ~* 'planet fitness' then 1000
      when d.name ~* 'la fitness|crunch|anytime|vasa|eos fitness|chuckwalla' then 1500
      when d.name ~* 'mountainside|track club' then 2000
      when d.name ~* 'life ?time|milan|athletic club' then 3500
      when d.name ~* 'orangetheory|f45' then 3000
      when d.style = 'crossfit' then 2500 + (d.h % 2) * 500
      when d.style = 'climbing' then 2000 + (d.h % 2) * 500
      when d.style in ('group_fitness', 'recovery_wellness') then 2500
      when d.style = 'functional_training' then 2000
      else 1500 + (d.h % 2) * 500
    end as day_cents
  from demo_gyms d
  where not exists (select 1 from public.pass_options o where o.gym_id = d.id and o.is_active)
)
insert into public.pass_options (gym_id, name, pass_type, duration_days, price_cents, price_confidence, is_demo)
select id, day_name, 'day'::public.pass_type, 1, day_cents, 'unverified'::public.price_confidence, true from priced
union all
select id, 'Week pass', 'week'::public.pass_type, 7, day_cents * 3 / 500 * 500, 'unverified'::public.price_confidence, true from priced
 where not chain and h % 2 = 0 and style not in ('climbing', 'group_fitness', 'recovery_wellness');

-- Hours (same text format as OpenStreetMap opening_hours)
update public.gyms g
   set hours = jsonb_build_object('text',
         case
           when d.open24 or d.name ~* 'planet fitness|anytime' then '24/7'
           when d.name ~* 'la fitness' then 'Mo-Th 05:00-23:00; Fr 05:00-22:00; Sa-Su 07:00-20:00'
           when d.name ~* 'orangetheory|f45' or d.style = 'group_fitness' then 'Mo-Fr 05:00-19:30; Sa-Su 07:00-11:00'
           when d.style = 'crossfit' then 'Mo-Fr 05:00-19:30; Sa 07:00-11:00'
           when d.style = 'climbing' then 'Mo-Fr 10:00-22:00; Sa-Su 09:00-20:00'
           when d.style in ('powerlifting', 'olympic_weightlifting', 'bodybuilding') then 'Mo-Fr 05:00-22:00; Sa-Su 07:00-18:00'
           when d.style = 'functional_training' then 'Mo-Fr 05:00-20:00; Sa 07:00-12:00'
           when d.style = 'recovery_wellness' then 'Mo-Fr 07:00-20:00; Sa-Su 08:00-17:00'
           else 'Mo-Fr 05:00-22:00; Sa-Su 07:00-19:00'
         end),
       hours_is_demo = true
  from demo_gyms d
 where g.id = d.id and g.hours is null;

drop table demo_gyms;

-- Front-desk staff: every account that exists now works the desk at one gym per city.
insert into public.gym_staff (gym_id, user_id)
select g.id, p.id
  from public.gyms g cross join public.profiles p
 where g.slug in ('phoenix-rock-gym', 'gecko-climbing-gym', 'camelback-crossfit')
on conflict do nothing;

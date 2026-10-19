-- DropSet | seed.sql  (re-runnable: uses ON CONFLICT)
-- 25 real Phoenix-area gyms researched 2026-10-14. Prices only exist where we found a published number.
-- price_confidence: official = gym/city website, third_party = article or blog (verify before demo).

-- ---------- Training styles ----------
insert into public.training_styles (slug, name) values
  ('general_fitness',       'General Fitness'),
  ('powerlifting',          'Powerlifting'),
  ('olympic_weightlifting', 'Olympic Weightlifting'),
  ('bodybuilding',          'Bodybuilding'),
  ('crossfit',              'CrossFit'),
  ('functional_training',   'Functional Training'),
  ('group_fitness',         'Group Fitness'),
  ('climbing',              'Climbing / Bouldering'),
  ('recovery_wellness',     'Recovery & Wellness')
on conflict (slug) do nothing;

-- ---------- Amenities ----------
insert into public.amenities (slug, name) values
  ('free_weights',     'Free Weights'),
  ('olympic_platforms','Lifting Platforms'),
  ('cardio',           'Cardio Equipment'),
  ('showers',          'Showers'),
  ('lockers',          'Lockers'),
  ('sauna',            'Sauna'),
  ('steam_room',       'Steam Room'),
  ('cold_plunge',      'Cold Plunge'),
  ('pool',             'Pool'),
  ('childcare',        'Childcare'),
  ('towel_service',    'Towel Service'),
  ('group_classes',    'Group Classes'),
  ('gear_rental',      'Gear Rental'),
  ('courts',           'Basketball / Pickleball / Tennis Courts'),
  ('open_24_hours',    'Open 24 Hours'),
  ('personal_training','Personal Training'),
  ('recovery',         'Recovery Room / Massage Chairs')
on conflict (slug) do nothing;

-- ---------- Gyms ----------
insert into public.gyms
  (slug, name, address_line1, city, postal_code, phone, website_url, notes, data_source, source_url, data_verified_at)
values
 ('camelback-crossfit','Camelback CrossFit','2950 N Hayden Rd','Scottsdale','85251',null,'https://camelbackcrossfit.com',
  'Drop-in class. First week free for new members. Open gym sessions most weekdays.','official_site','https://camelbackcrossfit.com/rates/','2026-10-14'),
 ('phoenix-rock-gym','Phoenix Rock Gym','1353 E University Dr','Tempe','85281','480-921-8322','https://phoenixrockgym.com',
  'Tax included. Under-18s need a parent-signed waiver. No contract.','official_site','https://phoenixrockgym.com/prices/','2026-10-14'),
 ('lifetime-north-scottsdale','Life Time North Scottsdale','North Scottsdale (street address not on source page)','Scottsdale',null,null,'https://www.lifetime.life/locations/az/north-scottsdale/memberships/daypass.html',
  'Day-pass fee is credited toward the first month if you join. Street address still needed.','official_site','https://www.lifetime.life/locations/az/north-scottsdale/memberships/daypass.html','2026-10-14'),
 ('lifetime-tempe','Life Time Tempe','1616 W Ruby Dr','Tempe','85284','480-735-5230','https://www.lifetime.life/locations/az/tempe.app.html',
  'Day pass gives full member access for a day. Price not published; call the club.','official_site','https://www.lifetime.life/locations/az/tempe.app.html','2026-10-14'),
 ('eos-fitness-mesa-baseline','EoS Fitness Mesa (Baseline)','2156 E Baseline Rd','Mesa','85204',null,'https://www.eosfitness.com/gym/gilbert',
  'No public day-pass price. Free 7-day pass for first-time visitors 18+ living within 25 miles (ID required).','official_site','https://www.eosfitness.com/gym/gilbert','2026-10-14'),
 ('eos-fitness-glendale','EoS Fitness Glendale','5070 W Olive Ave','Glendale','85302',null,'https://www.eosfitness.com/gym/glendale',
  'No public day-pass price. Free 7-day pass for first-time visitors 18+ living within 25 miles (ID required).','official_site','https://www.eosfitness.com/gym/glendale','2026-10-14'),
 ('mountainside-fitness-mesa','Mountainside Fitness Mesa','1253 N Greenfield Rd','Mesa','85205',null,'https://mountainsidefitness.com/locations/mesa/',
  'No public day-pass price. Advertises a free 5-day pass.','official_site','https://mountainsidefitness.com/locations/mesa/','2026-10-14'),
 ('mountainside-fitness-arrowhead','Mountainside Fitness Arrowhead','20250 N 75th Ave','Glendale','85308',null,'https://mountainsidefitness.com/locations/arrowhead/',
  'No public day-pass price. Advertises a free 5-day pass.','official_site','https://mountainsidefitness.com/locations/arrowhead/','2026-10-14'),
 ('crossfit-full-strength','CrossFit Full Strength','4633 E Thomas Rd','Phoenix','85018',null,null,
  'Prices come from a third-party blog; confirm on the gym site.','third_party_article','https://essentialsportsnutrition.com/blogs/news-top-gyms-in-2025/top-crossfit-gyms-of-2024-in-phoenix-az-location-features-pricing',null),
 ('hammer-crossfit','Hammer CrossFit','5444 E Washington St #3','Phoenix','85034',null,null,
  'No drop-in price published online; contact the gym.','third_party_article','https://essentialsportsnutrition.com/blogs/news-top-gyms-in-2025/top-crossfit-gyms-of-2024-in-phoenix-az-location-features-pricing',null),
 ('east-valley-crossfit','East Valley CrossFit','8 N Roosevelt Ave','Chandler','85226',null,null,
  'No drop-in price published online; contact the gym.','third_party_article','https://essentialsportsnutrition.com/blogs/news-top-gyms-in-2025/top-crossfit-gyms-of-2024-in-phoenix-az-location-features-pricing',null),
 ('next-level-performance','Next Level Performance Consulting','2200 N Scottsdale Rd C','Scottsdale','85257',null,null,
  'Pricing not published online; contact the gym.','third_party_article','https://essentialsportsnutrition.com/blogs/news-top-gyms-in-2025/top-crossfit-gyms-of-2024-in-phoenix-az-location-features-pricing',null),
 ('relentless-power-gym','Relentless Power Gym','5816 W San Miguel Ave','Glendale',null,null,null,
  'Source article is dated; verify price and that the gym is still open.','third_party_article','https://www.phoenixmag.com/?p=15348',null),
 ('fit-phoenix','Fit Phoenix','902 E McKinley St','Phoenix',null,null,null,
  'Source says a free one-week trial is offered. Source article is dated; verify gym is still open.','third_party_article','https://www.phoenixmag.com/?p=15348',null),
 ('revolution-training-system','Revolution Training System','606 W Southern Ave','Tempe',null,null,null,
  'Source lists unlimited access at $150/month; no day pass found. Source is dated; verify.','third_party_article','https://www.phoenixmag.com/?p=15348',null),
 ('green-zone-fitness','Green Zone Fitness','Address not found yet','Glendale',null,null,null,
  'Day-pass price from a third-party listing. Address and city still need confirming.','third_party_article','https://www.atly.com/united-states/arizona/glendale/best-gyms-weight-lifting-gym',null),
 ('black-rock-bouldering','Black Rock Bouldering Gym','10436 N 32nd St','Phoenix',null,null,null,
  'Price from an August 2023 article; verify.','third_party_article','https://coppercourier.com/news/indoor-rock-climbing-gyms-maricopa-county/',null),
 ('gecko-climbing-gym','Gecko Climbing Gym','24400 N 19th Ave Suite 115','Phoenix',null,null,null,
  'Price from an August 2023 article; verify.','third_party_article','https://coppercourier.com/news/indoor-rock-climbing-gyms-maricopa-county/',null),
 ('ape-index-climbing','Ape Index Rock Climbing Gym','9700 N 91st Ave','Peoria',null,null,null,
  'Price from an August 2023 article; military and first responder rate $17. Verify.','third_party_article','https://coppercourier.com/news/indoor-rock-climbing-gyms-maricopa-county/',null),
 ('alta-boulders','Alta Boulders','2945 S Alma School Rd','Chandler',null,null,null,
  'Price from an August 2023 article; verify.','third_party_article','https://coppercourier.com/news/indoor-rock-climbing-gyms-maricopa-county/',null),
 ('climbmax-rock-gym','Climbmax Rock Gym','1330 W Auto Dr Unit 108','Tempe',null,null,null,
  'Price from an August 2023 article; verify.','third_party_article','https://coppercourier.com/news/indoor-rock-climbing-gyms-maricopa-county/',null),
 ('az-on-the-rocks','AZ On the Rocks','16447 N 91st St Unit 105','Scottsdale',null,null,null,
  'Day-pass price not listed in source; contact the gym.','third_party_article','https://coppercourier.com/news/indoor-rock-climbing-gyms-maricopa-county/',null),
 ('kiwanis-recreation-center','Kiwanis Recreation Center (City of Tempe)','6111 S All America Way','Tempe','85283',null,'https://www.tempe.gov/government/community-services/community-recreation-centers/fitness-centers',
  'Municipal fitness room.','official_site','https://www.tempe.gov/government/community-services/community-recreation-centers/fitness-centers','2026-10-14'),
 ('pyle-adult-recreation-center','Pyle Adult Recreation Center (City of Tempe)','655 E Southern Ave','Tempe','85282',null,'https://www.tempe.gov/government/community-services/community-recreation-centers/fitness-centers',
  'Municipal fitness room. 18+ only, no lockers. Drop-in fee per center guidelines.','official_site','https://www.tempe.gov/government/community-services/community-recreation-centers/fitness-centers','2026-10-14'),
 ('north-tempe-multigen-center','North Tempe Multi-Generational Center (City of Tempe)','1555 N Bridalwreath St','Tempe','85288',null,'https://www.tempe.gov/government/community-services/community-recreation-centers/fitness-centers',
  'Municipal fitness room. $1 drop-in plus a free facility membership is required.','official_site','https://www.tempe.gov/government/community-services/community-recreation-centers/fitness-centers','2026-10-14')
on conflict (slug) do nothing;

update public.gyms set hours = '{"mon-fri":"15:00-22:00","sat-sun":"10:00-19:00"}'::jsonb where slug = 'phoenix-rock-gym';
update public.gyms set hours = '{"all":"24 hours"}'::jsonb where slug in ('eos-fitness-mesa-baseline','eos-fitness-glendale');

-- ---------- Training style tags ----------
insert into public.gym_training_styles (gym_id, style_id)
select g.id, s.id
from (values
  ('camelback-crossfit','crossfit'), ('camelback-crossfit','functional_training'), ('camelback-crossfit','group_fitness'),
  ('phoenix-rock-gym','climbing'), ('black-rock-bouldering','climbing'), ('gecko-climbing-gym','climbing'),
  ('ape-index-climbing','climbing'), ('alta-boulders','climbing'), ('climbmax-rock-gym','climbing'), ('az-on-the-rocks','climbing'),
  ('lifetime-north-scottsdale','general_fitness'), ('lifetime-north-scottsdale','group_fitness'), ('lifetime-north-scottsdale','recovery_wellness'),
  ('lifetime-tempe','general_fitness'), ('lifetime-tempe','group_fitness'), ('lifetime-tempe','recovery_wellness'),
  ('eos-fitness-mesa-baseline','general_fitness'), ('eos-fitness-mesa-baseline','powerlifting'), ('eos-fitness-mesa-baseline','group_fitness'),
  ('eos-fitness-glendale','general_fitness'), ('eos-fitness-glendale','olympic_weightlifting'), ('eos-fitness-glendale','group_fitness'),
  ('mountainside-fitness-mesa','general_fitness'), ('mountainside-fitness-mesa','functional_training'), ('mountainside-fitness-mesa','group_fitness'), ('mountainside-fitness-mesa','recovery_wellness'),
  ('mountainside-fitness-arrowhead','general_fitness'), ('mountainside-fitness-arrowhead','functional_training'), ('mountainside-fitness-arrowhead','group_fitness'), ('mountainside-fitness-arrowhead','recovery_wellness'),
  ('crossfit-full-strength','crossfit'), ('hammer-crossfit','crossfit'), ('east-valley-crossfit','crossfit'), ('next-level-performance','crossfit'),
  ('relentless-power-gym','powerlifting'), ('fit-phoenix','powerlifting'), ('revolution-training-system','powerlifting'),
  ('green-zone-fitness','general_fitness'),
  ('kiwanis-recreation-center','general_fitness'), ('pyle-adult-recreation-center','general_fitness'), ('north-tempe-multigen-center','general_fitness')
) as v(gym_slug, style_slug)
join public.gyms g on g.slug = v.gym_slug
join public.training_styles s on s.slug = v.style_slug
on conflict do nothing;

-- ---------- Amenities (only what the source pages state) ----------
insert into public.gym_amenities (gym_id, amenity_id)
select g.id, a.id
from (values
  ('phoenix-rock-gym','gear_rental'),
  ('lifetime-north-scottsdale','cardio'), ('lifetime-north-scottsdale','free_weights'), ('lifetime-north-scottsdale','pool'),
  ('lifetime-north-scottsdale','sauna'), ('lifetime-north-scottsdale','steam_room'), ('lifetime-north-scottsdale','lockers'),
  ('lifetime-north-scottsdale','courts'), ('lifetime-north-scottsdale','childcare'), ('lifetime-north-scottsdale','group_classes'),
  ('lifetime-tempe','pool'), ('lifetime-tempe','courts'), ('lifetime-tempe','cold_plunge'), ('lifetime-tempe','sauna'),
  ('lifetime-tempe','group_classes'), ('lifetime-tempe','childcare'), ('lifetime-tempe','lockers'),
  ('eos-fitness-mesa-baseline','free_weights'), ('eos-fitness-mesa-baseline','olympic_platforms'), ('eos-fitness-mesa-baseline','cardio'),
  ('eos-fitness-mesa-baseline','sauna'), ('eos-fitness-mesa-baseline','recovery'), ('eos-fitness-mesa-baseline','personal_training'),
  ('eos-fitness-mesa-baseline','group_classes'), ('eos-fitness-mesa-baseline','open_24_hours'),
  ('eos-fitness-glendale','free_weights'), ('eos-fitness-glendale','olympic_platforms'), ('eos-fitness-glendale','cardio'),
  ('eos-fitness-glendale','pool'), ('eos-fitness-glendale','sauna'), ('eos-fitness-glendale','personal_training'),
  ('eos-fitness-glendale','group_classes'), ('eos-fitness-glendale','open_24_hours'),
  ('mountainside-fitness-mesa','free_weights'), ('mountainside-fitness-mesa','cardio'), ('mountainside-fitness-mesa','towel_service'),
  ('mountainside-fitness-mesa','showers'), ('mountainside-fitness-mesa','lockers'), ('mountainside-fitness-mesa','steam_room'),
  ('mountainside-fitness-mesa','sauna'), ('mountainside-fitness-mesa','cold_plunge'), ('mountainside-fitness-mesa','group_classes'),
  ('mountainside-fitness-mesa','courts'), ('mountainside-fitness-mesa','recovery'),
  ('mountainside-fitness-arrowhead','free_weights'), ('mountainside-fitness-arrowhead','cardio'), ('mountainside-fitness-arrowhead','towel_service'),
  ('mountainside-fitness-arrowhead','showers'), ('mountainside-fitness-arrowhead','lockers'), ('mountainside-fitness-arrowhead','steam_room'),
  ('mountainside-fitness-arrowhead','group_classes'), ('mountainside-fitness-arrowhead','courts'), ('mountainside-fitness-arrowhead','recovery'),
  ('kiwanis-recreation-center','cardio'), ('kiwanis-recreation-center','free_weights'),
  ('pyle-adult-recreation-center','cardio'), ('pyle-adult-recreation-center','free_weights'),
  ('north-tempe-multigen-center','cardio'), ('north-tempe-multigen-center','free_weights'), ('north-tempe-multigen-center','towel_service')
) as v(gym_slug, amenity_slug)
join public.gyms g on g.slug = v.gym_slug
join public.amenities a on a.slug = v.amenity_slug
on conflict do nothing;

-- ---------- Pass options (prices in cents; only where a price was found) ----------
insert into public.pass_options
  (gym_id, name, pass_type, duration_days, price_cents, price_confidence, price_source_url, price_verified_at, notes)
select g.id, v.name, v.pass_type::public.pass_type, v.days, v.cents, v.conf::public.price_confidence, v.url, v.verified::date, v.notes
from (values
 ('camelback-crossfit','Drop-In Class','day',1,2000,'official','https://camelbackcrossfit.com/rates/','2026-10-14','Single class; all equipment provided.'),
 ('phoenix-rock-gym','Day Pass','day',1,2000,'official','https://phoenixrockgym.com/prices/','2026-10-14','Gear not included.'),
 ('phoenix-rock-gym','Day Pass with Gear','day',1,2600,'official','https://phoenixrockgym.com/prices/','2026-10-14','Shoes, harness, and carabiner included.'),
 ('phoenix-rock-gym','Two Week Pass','week',14,4000,'official','https://phoenixrockgym.com/prices/','2026-10-14','No one-week option; this is the closest.'),
 ('phoenix-rock-gym','Month Pass','month',30,7500,'official','https://phoenixrockgym.com/prices/','2026-10-14',null),
 ('lifetime-north-scottsdale','Day Pass','day',1,5000,'official','https://www.lifetime.life/locations/az/north-scottsdale/memberships/daypass.html','2026-10-14','Includes classes, pool, sauna, courts.'),
 ('crossfit-full-strength','Drop-In','day',1,3000,'third_party','https://essentialsportsnutrition.com/blogs/news-top-gyms-in-2025/top-crossfit-gyms-of-2024-in-phoenix-az-location-features-pricing',null,null),
 ('crossfit-full-strength','Week Pass','week',7,7500,'third_party','https://essentialsportsnutrition.com/blogs/news-top-gyms-in-2025/top-crossfit-gyms-of-2024-in-phoenix-az-location-features-pricing',null,null),
 ('relentless-power-gym','Day Pass','day',1,1000,'third_party','https://www.phoenixmag.com/?p=15348',null,'Dated source.'),
 ('revolution-training-system','Month Unlimited','month',30,15000,'third_party','https://www.phoenixmag.com/?p=15348',null,'Dated source.'),
 ('green-zone-fitness','Day Pass','day',1,1500,'third_party','https://www.atly.com/united-states/arizona/glendale/best-gyms-weight-lifting-gym',null,null),
 ('black-rock-bouldering','Day Pass','day',1,2300,'third_party','https://coppercourier.com/news/indoor-rock-climbing-gyms-maricopa-county/',null,'August 2023 price.'),
 ('gecko-climbing-gym','Day Pass','day',1,2500,'third_party','https://coppercourier.com/news/indoor-rock-climbing-gyms-maricopa-county/',null,'August 2023 price.'),
 ('ape-index-climbing','Day Pass','day',1,2500,'third_party','https://coppercourier.com/news/indoor-rock-climbing-gyms-maricopa-county/',null,'August 2023 price.'),
 ('alta-boulders','Day Pass','day',1,2300,'third_party','https://coppercourier.com/news/indoor-rock-climbing-gyms-maricopa-county/',null,'August 2023 price.'),
 ('climbmax-rock-gym','Day Pass','day',1,1400,'third_party','https://coppercourier.com/news/indoor-rock-climbing-gyms-maricopa-county/',null,'August 2023 price.'),
 ('kiwanis-recreation-center','Drop-In','day',1,400,'official','https://www.tempe.gov/government/community-services/community-recreation-centers/fitness-centers','2026-10-14',null),
 ('pyle-adult-recreation-center','Drop-In','day',1,200,'official','https://www.tempe.gov/government/community-services/community-recreation-centers/fitness-centers','2026-10-14','18+ only.'),
 ('north-tempe-multigen-center','Drop-In','day',1,100,'official','https://www.tempe.gov/government/community-services/community-recreation-centers/fitness-centers','2026-10-14','Free facility membership also required.')
) as v(gym_slug, name, pass_type, days, cents, conf, url, verified, notes)
join public.gyms g on g.slug = v.gym_slug
on conflict (gym_id, name) do nothing;

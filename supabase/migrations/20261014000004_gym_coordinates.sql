-- DropSet | Migration 4: coordinates for the seeded gyms so distance search works.
-- Source: US Census Geocoder (public domain, no key), checked 2026-10-18. Two rows use
-- OpenStreetMap instead (marked). Google Places data is NOT stored here (terms limit caching).
-- Still NULL: lifetime-north-scottsdale and green-zone-fitness (no street address yet).
-- Safe to re-run.

update public.gyms set lat = 33.263497, lng = -111.856280 where slug = 'alta-boulders';  -- OpenStreetMap (Census had no match or the wrong N/S side)
update public.gyms set lat = 33.572159, lng = -112.255081 where slug = 'ape-index-climbing';
update public.gyms set lat = 33.635411, lng = -111.884836 where slug = 'az-on-the-rocks';
update public.gyms set lat = 33.580996, lng = -112.013137 where slug = 'black-rock-bouldering';
update public.gyms set lat = 33.481279, lng = -111.909003 where slug = 'camelback-crossfit';
update public.gyms set lat = 33.342926, lng = -111.958359 where slug = 'climbmax-rock-gym';
update public.gyms set lat = 33.480097, lng = -111.981719 where slug = 'crossfit-full-strength';
update public.gyms set lat = 33.303527, lng = -111.951109 where slug = 'east-valley-crossfit';
update public.gyms set lat = 33.567565, lng = -112.168349 where slug = 'eos-fitness-glendale';
update public.gyms set lat = 33.379081, lng = -111.785524 where slug = 'eos-fitness-mesa-baseline';
update public.gyms set lat = 33.456835, lng = -112.061350 where slug = 'fit-phoenix';
update public.gyms set lat = 33.707339, lng = -112.100040 where slug = 'gecko-climbing-gym';
update public.gyms set lat = 33.445799, lng = -111.964722 where slug = 'hammer-crossfit';
update public.gyms set lat = 33.366771, lng = -111.936409 where slug = 'kiwanis-recreation-center';
update public.gyms set lat = 33.341307, lng = -111.964517 where slug = 'lifetime-tempe';  -- OpenStreetMap (Census had no match or the wrong N/S side)
update public.gyms set lat = 33.668629, lng = -112.220456 where slug = 'mountainside-fitness-arrowhead';
update public.gyms set lat = 33.438302, lng = -111.736278 where slug = 'mountainside-fitness-mesa';
update public.gyms set lat = 33.471994, lng = -111.926260 where slug = 'next-level-performance';
update public.gyms set lat = 33.446673, lng = -111.922140 where slug = 'north-tempe-multigen-center';
update public.gyms set lat = 33.421970, lng = -111.917820 where slug = 'phoenix-rock-gym';
update public.gyms set lat = 33.392896, lng = -111.929786 where slug = 'pyle-adult-recreation-center';
update public.gyms set lat = 33.519703, lng = -112.184469 where slug = 'relentless-power-gym';
update public.gyms set lat = 33.392902, lng = -111.947931 where slug = 'revolution-training-system';

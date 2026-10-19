-- DropSet | Migration 5: search_gyms returns what a result card needs in one call.
-- Same parameters as before; adds amenity_slugs, cover_photo_url, min_price_pass_type, min_price_confidence.
-- The return type changes, so the function is dropped and recreated (callers using select * keep working).

drop function if exists public.search_gyms(double precision, double precision, double precision, text, text[], int);

create function public.search_gyms(
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
  min_price_pass_type  public.pass_type,
  min_price_confidence public.price_confidence,
  style_slugs          text[],
  amenity_slugs        text[],
  cover_photo_url      text,
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
    cheapest.price_cents, cheapest.pass_type, cheapest.price_confidence,
    coalesce((select array_agg(ts.slug order by ts.slug)
                from public.gym_training_styles gts
                join public.training_styles ts on ts.id = gts.style_id
               where gts.gym_id = g.id), '{}'),
    coalesce((select array_agg(a.slug order by a.slug)
                from public.gym_amenities ga
                join public.amenities a on a.id = ga.amenity_id
               where ga.gym_id = g.id), '{}'),
    (select ph.url from public.gym_photos ph where ph.gym_id = g.id order by ph.sort_order limit 1),
    g.is_partner
  from public.gyms g
  cross join pt
  left join lateral (
    select po.price_cents, po.pass_type, po.price_confidence
      from public.pass_options po
     where po.gym_id = g.id and po.is_active
     order by po.price_cents
     limit 1
  ) cheapest on true
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

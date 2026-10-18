// DropSet | Builds supabase/seed_osm_gyms.sql from OpenStreetMap.
// Gyms in Phoenix, Tempe and Scottsdale (Overpass), with Nominatim filling missing street addresses.
// OSM data is ODbL: storing it is allowed, the app must show "© OpenStreetMap contributors".
//
// Run from the repo root (Node 18+, no packages):
//   SUPABASE_URL=https://bcskupguftgwjcpkvnoo.supabase.co SUPABASE_KEY=<publishable key> node supabase/scripts/import_osm_gyms.mjs
// The key is only used to read existing gyms (public catalog) so we skip duplicates.

import { writeFileSync } from 'node:fs';

const CITIES = ['Phoenix', 'Tempe', 'Scottsdale'];
const UA = 'DropSet-CIS440/1.0 (student project)';
const OUT = 'supabase/seed_osm_gyms.sql';
const TODAY = new Date().toISOString().slice(0, 10);

// Not what a traveling lifter is looking for, or not sold to visitors.
const EXCLUDE = /yoga|pilates|barre|aerial|dance|jazzercise|boxing|kickbox|knockout|muay thai|mma|martial|gracie|jiu|defen[cs]e|cycle|cycling|spin|power\+flow|stretch|gymnast|gymnadtic|cheer|ninja|little gym|hotworx|solidcore|personal|exercise coach|^exercise room$|weight loss|sun devil fitness|our lady|shanti|sutra|ascension chamber|^air$|^vivre$|^how are you/i;
const EXCLUDE_SPORT = /yoga|pilates|boxing|kickboxing|martial|self_defense|cycling|gymnastics|personal_training/;

const STYLE_RULES = [
  ['climbing', /climb|boulder|rock gym/i],
  ['crossfit', /cross ?fit/i],
  ['olympic_weightlifting', /weightlifting|olympia/i],
  ['powerlifting', /barbell|strength|strong|power(?!\+)|muscle|iron|weights|plates|gains|lift/i],
  ['bodybuilding', /muscle|gains|bodybuild|physique/i],
  ['group_fitness', /orangetheory|f45|boot ?camp|\bbft\b|eat the frog|truhit|track club|burn /i],
  ['functional_training', /performance|athlet|training|acceleration|exos|opex|d1 |f45|\bbft\b|method/i],
  ['general_fitness', /planet fitness|la fitness|e[oō]s fitness|vasa|youfit|anytime fitness|crunch|esporta|life ?time|mountainside|24 hour|gold'?s|fitness 1|athletic club/i],
  ['recovery_wellness', /recovery|life ?time/i],
];
// OSM entries that are a seeded gym under another name: fill the seed row instead of adding a duplicate.
const SAME_AS = { 'way/96326164': 'lifetime-north-scottsdale' }; // OSM calls it "Life Time" in Phoenix
const SPORT_STYLES = { climbing: 'climbing', crossfit: 'crossfit', weightlifting: 'olympic_weightlifting' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (v) => (v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const norm = (s) => s.normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
const slugify = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const meters = (a, b) => {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

async function overpass(city) {
  const query = `[out:json][timeout:90];
area["name"="${city}"]["boundary"="administrative"]["admin_level"="8"]->.a;
( nwr["leisure"="fitness_centre"](area.a);
  nwr["sport"~"climbing|crossfit|weightlifting|fitness"]["leisure"~"sports_centre|sports_hall"](area.a); );
out tags center;`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', headers: { 'User-Agent': UA }, body: new URLSearchParams({ data: query }),
    });
    if (res.ok) return (await res.json()).elements;
    if (res.status !== 429 && res.status !== 504 || attempt === 4) throw new Error(`Overpass ${city}: ${res.status}`);
    await sleep(15000 * attempt); // public server is shared; back off and retry
  }
}

async function reverse(lat, lng) {
  await sleep(1100); // Nominatim policy: max 1 request per second
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`;
  const a = (await fetch(url, { headers: { 'User-Agent': UA } }).then((r) => r.json())).address ?? {};
  return { line1: [a.house_number, a.road].filter(Boolean).join(' ') || null, postcode: a.postcode ?? null };
}

async function existingGyms() {
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Set SUPABASE_URL and SUPABASE_KEY');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/gyms?select=slug,name,city,lat,lng`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase: ${res.status}`);
  return res.json();
}

const existing = await existingGyms();
const usedSlugs = new Set(existing.map((g) => g.slug));
const gyms = [];
const fills = [];
const seen = new Set();

for (const city of CITIES) {
  for (const el of await overpass(city)) {
    const t = el.tags ?? {};
    const name = t.name?.replace(/\s+/g, ' ').trim();
    const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
    const key = `${el.type}/${el.id}`;
    if (!name || lat == null || seen.has(key)) continue;
    if (EXCLUDE.test(name) || EXCLUDE_SPORT.test(t.sport ?? '')) continue;
    if (['private', 'customers', 'no'].includes(t.access) || /appointment/i.test(t.opening_hours ?? '')) continue;
    seen.add(key);

    // Already seeded? Same name family within 300 m (or same city when the seed has no coordinates).
    const n = norm(name);
    const line1 = t['addr:housenumber'] && t['addr:street'] ? `${t['addr:housenumber']} ${t['addr:street']}` : null;
    const match = existing.find((g) => g.slug === SAME_AS[key]) ?? existing.find((g) => {
      const gn = norm(g.name);
      const sameName = gn.startsWith(n) || n.startsWith(gn) || gn.slice(0, 6) === n.slice(0, 6);
      if (!sameName) return false;
      return g.lat != null ? meters(g, { lat, lng }) < 300 : g.city === city;
    });
    if (match) {
      if (match.lat == null) fills.push({ slug: match.slug, lat, lng, key, line1, postcode: t['addr:postcode'] });
      continue;
    }
    // OSM sometimes maps the same gym twice.
    if (gyms.some((g) => norm(g.name) === n && meters(g, { lat, lng }) < 60)) continue;

    const styles = new Set();
    for (const s of (t.sport ?? '').split(';')) if (SPORT_STYLES[s]) styles.add(SPORT_STYLES[s]);
    for (const [slug, re] of STYLE_RULES) if (re.test(name)) styles.add(slug);
    if (!styles.size) styles.add('general_fitness');

    gyms.push({
      key, name, city, lat, lng, styles: [...styles],
      line1,
      street: t['addr:street'] ?? null,
      postcode: t['addr:postcode'] ?? null,
      phone: t.phone ?? t['contact:phone'] ?? null,
      website: t.website ?? t['contact:website'] ?? null,
      hours: t.opening_hours ?? null,
    });
  }
}

for (const g of gyms) {
  if (!g.line1) {
    const r = await reverse(g.lat, g.lng);
    g.line1 = r.line1;
    g.street ??= r.line1?.replace(/^\d+\s+/, '') ?? null;
    g.postcode ??= r.postcode;
  }
  // Chains repeat names, so add the street (then a number) until the slug is unique.
  const city = slugify(g.city);
  const name = slugify(g.name);
  const base = name.includes(city) ? name : `${name}-${city}`;
  const street = slugify((g.street ?? '').replace(/^(north|south|east|west|[nsew])\s+/i, '').replace(/\s+(road|rd|street|st|avenue|ave|boulevard|blvd|drive|dr|parkway|pkwy|way|lane|ln)\.?$/i, ''));
  let slug = base;
  if (usedSlugs.has(slug) && street && !base.includes(street)) slug = `${base}-${street}`;
  for (let i = 2; usedSlugs.has(slug); i++) slug = `${base}-${i}`;
  usedSlugs.add(slug);
  g.slug = slug;
}

const rows = gyms.map((g) =>
  ` (${[q(g.slug), q(g.name), q(g.line1), q(g.city), q(g.postcode), g.lat.toFixed(6), g.lng.toFixed(6), q(g.phone), q(g.website),
     g.hours ? `${q(JSON.stringify({ text: g.hours }))}::jsonb` : 'null', q('openstreetmap'), q(`https://www.openstreetmap.org/${g.key}`), q(TODAY)].join(', ')})`);
const styleRows = gyms.flatMap((g) => g.styles.map((s) => `(${q(g.slug)},${q(s)})`));
const amenityRows = gyms.filter((g) => g.hours === '24/7').map((g) => `(${q(g.slug)},'open_24_hours')`);

const sql = `-- DropSet | seed_osm_gyms.sql  (generated by supabase/scripts/import_osm_gyms.mjs on ${TODAY}; re-runnable)
-- ${gyms.length} gyms in ${CITIES.join(', ')} from OpenStreetMap. Data © OpenStreetMap contributors (ODbL).
-- No prices: OSM has none. Gyms already in seed.sql are skipped.

insert into public.gyms
  (slug, name, address_line1, city, postal_code, lat, lng, phone, website_url, hours, data_source, source_url, data_verified_at)
values
${rows.join(',\n')}
on conflict (slug) do nothing;
${fills.map((f) => `\n-- Seeded gym found in OSM (${f.key}): fill its location.
update public.gyms set lat = ${f.lat.toFixed(6)}, lng = ${f.lng.toFixed(6)},
  address_line1 = coalesce(${q(f.line1)}, address_line1), postal_code = coalesce(${q(f.postcode)}, postal_code),
  notes = nullif(trim(replace(notes, 'Street address still needed.', '')), '')
where slug = ${q(f.slug)} and lat is null;`).join('\n')}

insert into public.gym_training_styles (gym_id, style_id)
select g.id, s.id
from (values
  ${styleRows.join(',\n  ')}
) as v(gym_slug, style_slug)
join public.gyms g on g.slug = v.gym_slug
join public.training_styles s on s.slug = v.style_slug
on conflict do nothing;
${amenityRows.length ? `
insert into public.gym_amenities (gym_id, amenity_id)
select g.id, a.id
from (values ${amenityRows.join(', ')}) as v(gym_slug, amenity_slug)
join public.gyms g on g.slug = v.gym_slug
join public.amenities a on a.slug = v.amenity_slug
on conflict do nothing;
` : ''}`;

writeFileSync(OUT, sql);
console.log(`${gyms.length} gyms, ${fills.length} coordinate fills, ${gyms.filter((g) => !g.line1).length} still without street address -> ${OUT}`);

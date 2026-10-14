# DropSet Database (Supabase / Postgres)

Owner: Sage Stone (Database). Supabase project: `bcskupguftgwjcpkvnoo`.

## Files
- `supabase/migrations/20261014000001_schema.sql` - extensions, enums, tables, indexes
- `supabase/migrations/20261014000002_security_and_functions.sql` - RLS policies, signup trigger, pass functions, expiry job
- `supabase/seed.sql` - 25 real Phoenix-area gyms, styles, amenities, and known pass prices

Run in that order in the Supabase SQL editor (or `supabase db reset` with the CLI). The seed can be re-run safely.

## Tables
| Table | Purpose |
|---|---|
| `profiles` | One row per user, linked to Supabase Auth. Created automatically on signup. |
| `gyms` | Gym details, city, optional lat/lng, `google_place_id`, `stripe_account_id` (future payouts). |
| `training_styles`, `gym_training_styles` | Style tags (powerlifting, CrossFit, climbing...) used for search filters. |
| `amenities`, `gym_amenities` | Amenity tags (sauna, pool, lockers...). |
| `gym_photos` | Photo URLs per gym (empty for now). |
| `pass_options` | What a gym sells: day, week, or month pass, with price in cents and a confidence flag. |
| `purchases` | A payment attempt. Written by the backend only. |
| `passes` | The digital pass (QR `code`), status, activation and expiry. |
| `check_ins` | Logged when a pass is activated. |
| `saved_gyms` | A user's favorite gyms. |

## Functions (call with `supabase.rpc(...)`)
| Function | Who calls it | What it does |
|---|---|---|
| `search_gyms(p_lat, p_lng, p_radius_m, p_city, p_style_slugs, p_max_price_cents)` | App (anon or signed in) | Gym search with distance, style, price, and city filters. |
| `activate_pass(p_pass_id)` | App (signed in) | Starts the pass clock, sets `expires_at`, logs a check-in. |
| `validate_pass(p_code)` | Gym staff / app (signed in) | Returns whether a scanned QR code is valid right now. |
| `fulfill_purchase(p_purchase_id)` | Backend only (service role) | After Stripe confirms payment: marks purchase succeeded and creates the pass. Safe to retry. |
| `expire_passes()` | Scheduled job (pg_cron every 5 min) | Marks overdue active passes as expired. |

## Security model
- Row-level security is on for every table.
- Gym catalog, styles, amenities, photos, and pass options are public to read.
- Profiles, saved gyms, purchases, passes, and check-ins are visible only to their owner.
- Clients cannot write purchases, passes, or check-ins directly. Only the backend (service role) and the functions above can, so a user cannot mark themselves as paid.
- Never put the service role key in the mobile app.

## Pass lifecycle
`purchases.pending` -> Stripe webhook -> `fulfill_purchase` -> `passes.inactive` -> traveler taps Activate -> `activate_pass` -> `passes.active` -> `expire_passes` -> `passes.expired`

## Data notes and open items
- `price_confidence`: `official` (gym or city website, checked 2026-10-14), `third_party` (article or blog, verify before demo).
- Many chains (EoS, Mountainside, Life Time Tempe) publish no day-pass price, so they have no `pass_options` rows yet. Their free-trial offers are in `gyms.notes`.
- Lat/lng are empty on purpose. Google limits how long Places data can be cached, so coordinates will be filled in the Google Places step. Until then search by `p_city`.
- Google Places terms: store only `google_place_id` long term, fetch other details live.
- Auth is Supabase Auth (not Clerk as in the original plan). User IDs are uuids from `auth.users`.

# DropSet: context for anyone (or any AI) working in this repo

DropSet is a CIS 440 capstone: log your training every day, and when you travel, find and buy a day pass at a gym that fits how you train.

**Start with `ROADMAP.md`**: the product plan, decisions, and the phase we are on. Update it when a phase ships or a decision changes.

Live web app: https://dropset-app.vercel.app (deploy with `npm run deploy` in `mobile/`).

## Architecture

```
mobile/  (Expo app: iOS, Android, web)
   |  supabase-js with the PUBLISHABLE key; Supabase Auth sessions
   v
Supabase (project bcskupguftgwjcpkvnoo): Postgres + RLS + RPCs (search_gyms, activate_pass, validate_pass)
   ^
   |  pg pool (server-side secrets)
server.js (Express): Sprint 1 template login today
```

- **The app** reads the gym catalog and the signed-in user's own rows directly through Supabase. Row-level security (`auth.uid()`) enforces ownership. It never holds the DB password, `JWT_SECRET`, or the service_role key.
- **Anything that needs a secret** (Stripe, the service role) runs server-side: Vercel functions or Express, still undecided (ROADMAP Phase 8). It must verify the caller's **Supabase** access token (`supabase.auth.getUser(token)`), not the Sprint 1 custom JWT.
- **Two user systems, on purpose for now:** `public.app_users` + `/api/login` exist only for the Sprint 1 grade. Real users are Supabase Auth (`auth.users` → `profiles` via trigger). Retire `app_users` when the class no longer needs it.

## Where to look

- `ROADMAP.md`: what to build next, in order, with the decisions behind it.
- `mobile/README.md`: run on phone/web, folder map, design rules, Supabase dashboard setup, Vercel deploy.
- `mobile/src/lib/api.ts`: every query the app makes.
- `mobile/src/theme/tokens.ts`: the design system. Don't add colors outside it.
- Database: `DATABASE.md`, `supabase/migrations/*`, `supabase/seed.sql`, `supabase/seed_osm_gyms.sql`.

## Rules of thumb

- Money is integer cents; format in the UI (`money()` in `src/lib/format.ts`).
- Expo changes every SDK. Check `mobile/AGENTS.md` and the versioned docs before using an Expo API from memory.
- Install packages with `npx expo install`. Before pushing, run `npx tsc --noEmit` and `npx expo lint` in `mobile/`.
- Schema changes go in a new `supabase/migrations/2026101400000N_*.sql`. Then regenerate `mobile/src/lib/database.types.ts`.
- OpenStreetMap data needs "© OpenStreetMap contributors" wherever gyms are listed. Never store Google Places data beyond `place_id`.

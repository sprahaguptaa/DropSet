# DropSet roadmap

The single source of truth for what we build next and why. Read this before starting a phase; update the
**Status** column and the **Decisions** list when something ships or changes. Live app: https://dropset-app.vercel.app

## Product thesis

**Log your training every day; when you travel, DropSet is where you find and buy your gym.**
Travel alone is a few-times-a-year app. A Strava-style daily habit (check-ins, streaks, goals, friends)
keeps people opening it; day passes and gym partnerships make the money. Every check-in at a gym is also
free promotion for that gym and fresh, verified data for travelers.

## Principles (apply to every phase)

1. **Close loops, don't pile on features.** Each phase ships one complete, usable thing: one PR, merged to `main`, deployed.
2. **Single-player first, social second.** A feature must be worth using with zero followers before it gets a social layer. An empty feed kills apps.
3. **Safety by design.** Never expose where someone is unless they chose to. Block and report exist before anyone can see anyone else's activity (Apple requires it for user content).
4. **Positive accountability.** Streaks, "5 days strong", nudges from friends. Never broadcast that someone skipped.
5. **No fake data.** No invented ratings, prices, or activity. Unknown is shown as unknown. Demo placeholders are always labeled and never counted (see Reviews under Decisions).
6. **No redundant features.** If two buttons mean almost the same thing, ship one.
7. **Lean code.** Everything goes through `mobile/src/lib/api.ts`, design tokens only, `tsc` + `expo lint` clean, schema changes as a new numbered migration.

## Where we are (done)

| Area | State |
|---|---|
| Data | 210 Phoenix-area gyms (25 researched + 185 OpenStreetMap), coordinates, styles, 19 priced pass options |
| Search | City / airport / campus / near me, style + price filters, 30-mile radius, nearest first |
| Gym page | Pass options with verified/estimated price labels, hours, amenities, save, 1-5 dumbbell reviews + Google Maps reviews link |
| Accounts | Supabase Auth (email), profile name + home city + photo, saved gyms |
| Passes | Passes list, QR + Activate (`activate_pass`), checkout summary (Pay disabled) |
| Platform | Expo app (web + Expo Go), deployed on Vercel, no `.env` needed, Supabase email links go to the live site |

## Decisions

| Decision | Choice | Notes |
|---|---|---|
| Account visibility | **Public profiles** with per-person toggles | `share_gym` (show which gym on check-ins) **off** by default; `show_checkins` and `show_goals` **on** by default; each switchable in Profile. Block/report always available. |
| Daily log vs pass check-in | Separate tables | Existing `check_ins` = a pass activated at a gym desk. Daily logs live in a new `workouts` table. Never mix them. |
| Saved gyms vs following a gym | Keep the heart as **Save** (trip shortlist) | **Follow gym** ships only in Phase 6, when gyms can post. Before that it would do nothing. |
| Trip mode UX | Smart pick inline, not a chatbot | Suggest the best-value pass for the trip length on the gym page and at checkout. A chat assistant can come later if wanted. |
| Payments | Stripe test mode, **later** (Phase 8) | Where the server code lives (Vercel functions vs Express `server.js`) is still open. |
| How we make money | **Decide later** (Phase 9) | Options on the table: sponsored gym placement (always labeled "Sponsored", never changes nearest-first order), revenue share on day passes and gym memberships sold through the app, traveler service fee. `purchases.platform_fee_cents` already exists. |
| Notifications | In-app first | Push notifications need a development build (not Expo Go). Revisit after Phase 4. |
| Reviews | **1-5 dumbbells**, 40 words max, any signed-in user, one per gym | Pulled forward from Phase 4 for the demo. Each gym has 3 **sample** reviews: no author, badged "Sample review", left out of the rating, hidden once the gym has 3 real reviews. Remove them with `delete from gym_reviews where is_sample;`. Google's terms don't allow storing their reviews, so every gym links out to Google Maps. Report writes to `review_reports`. |
| Hosting | Vercel project `dropset` (Sage's account) | `npm run deploy` in `mobile/`. Auto-deploy needs the repo owner to approve Vercel's GitHub access. |

## Phases

Status: ⬜ not started · 🟨 in progress · ✅ done

### Phase 0: Quick wins ✅ (2026-10-21)
- **Vercel Web Analytics**: add the web-only analytics component; Sage clicks *Enable* under Analytics in the Vercel dashboard once.
- **Profile photo**: Supabase Storage bucket `avatars` (public read, a user can only write `avatars/{their id}/…`), upload from Profile with `expo-image-picker`, store the URL in `profiles.avatar_url` (column already exists), show it everywhere the initial circle appears today.
- **Security fix**: revoke `EXECUTE` on `public.handle_new_user()` from `anon` / `authenticated` (it's a trigger function and shouldn't be callable through the API).
- **Done when**: page views show in Vercel Analytics; a user can set and change their photo on web and phone; the Supabase security advisor no longer flags `handle_new_user`.
- **Shipped**: `supabase/migrations/20261014000006_avatars_and_security.sql`, `Avatar`, `photo-picker.ts`, `WebAnalytics(.web).tsx`. Analytics also needs *Enable* clicked once in the Vercel dashboard.

### Phase 1: National gym data ⬜
- Generalize `supabase/scripts/import_osm_gyms.mjs` to take a list of metros; import ~15 big travel metros: Las Vegas, Los Angeles, San Diego, San Francisco, New York City, Miami, Orlando, Chicago, Austin, Denver, Seattle, Nashville, Atlanta, Boston, Dallas (adjust as needed).
- New `places` table (slug, label, detail, kind city/airport/campus, lat, lng, state, sort order) replaces the hard-coded list in `mobile/src/lib/places.ts`, so adding a city needs no app update. Include each metro's main airport.
- Explore: "Popular destinations" row; Search lists places from the table.
- Keep OSM attribution; run the same exclusion rules (yoga, pilates, boxing…); spot-check each metro.
- **Done when**: searching any listed metro or its airport returns gyms nearest-first; "Near me" works in those cities.
- Note: new cities arrive without prices ("Price not listed") until Phase 6.

### Phase 2: Daily check-in (single-player) ⬜
- Onboarding question after sign-up: **"Do you train most days?"** → `profiles.training_mode` = `daily` (app opens to Today) or `traveler` (opens to Explore). Changeable in Profile.
- `workouts` table: id, user_id, `logged_on` (date, one per user per day), `kind` (lift / climb / class / cardio / sport / rest), optional `gym_id`, optional note, created_at. RLS: the owner can do anything; reads by others come in Phase 4.
- "Log today" button (Explore header + Profile), streak (consecutive days, rest days count), this-week calendar on Profile. Streak computed in SQL (`my_streak()`).
- **Done when**: a user logs a day in two taps, sees their streak and week, and can edit or delete today's entry.

### Phase 3: Goals ⬜
- `goals` table: id, user_id, `kind` (bodyweight / lift / climb_grade), `lift` (squat / bench / deadlift / press, for lift goals), `target_value`, unit (lb/kg, V-grade), achieved_at. `goal_entries`: goal_id, value, logged_on, optional workout_id.
- Goals section on Profile with progress toward each target; log a new PR from the daily check-in.
- **Done when**: a user sets "Deadlift 405 lb", logs entries over time, sees progress, and gets a "Goal hit" moment when they reach it.

### Phase 4: Social layer ⬜
- Profiles: unique `username`, `bio`, avatar (Phase 0), privacy toggles `share_gym` (default off), `show_checkins` (default on), `show_goals` (default on).
- `follows` (follower_id, followee_id); followers / following counts on Profile; find people by username; share-profile link.
- **Feed tab** (becomes the 5th tab): check-ins and PRs from people you follow, respecting their toggles. The gym name appears only if that user turned on `share_gym`; handled in one feed RPC so privacy can't be bypassed from the client.
- **Props** (one-tap kudos), **nudge** a friend (in-app), opt-in **accountability partners** (mutual; only partners see a missed day).
- `blocks` and `reports` tables; blocked users can't see or follow each other; report from any profile or post.
- **Done when**: two accounts can follow each other, see each other's check-ins and PRs in the feed per their toggles, give props, nudge, block, and report.

### Phase 5: Lifter-grade facts ⬜
- Equipment facts per gym: squat racks (count), deadlift platforms, bumper plates, specialty bars, chalk allowed, turf / sled, climbing: bouldering / top rope / lead. Lookup table + `gym_equipment` (gym_id, item, value, verified_count, last_verified_at).
- Filters in Search for these facts; facts shown on the gym page with "verified by N lifters".
- After a check-in at a gym: one prompt, "Was this accurate?" → `fact_votes`. This is the moat: verified, lifter-specific data that Google and ClassPass don't have.
- **Done when**: you can filter for "3+ racks, chalk OK" and a check-in can confirm or correct a fact.

### Phase 6: Gym partner portal ⬜
- `gym_staff` (gym_id, user_id, role); claim-a-gym request, approved manually for now.
- Staff can edit their gym's description, hours, photos (`gym_photos`), and pass options/prices (RLS limited to their gym).
- Public gym profile with **Follow gym** (`gym_follows`) and **gym posts** (classes, events, offers) that appear in followers' feeds.
- "Request price" button on unpriced gyms → a list for outreach.
- **Done when**: a gym account can claim a listing, set a $20 day pass, post an update, and a follower sees it in their feed.

### Phase 7: Trip mode ⬜
- Trip dates in Search (optional) carried into results and gym pages.
- Smart pick: for the trip length, compare the gym's pass options (e.g., 3 day passes vs one week pass) and highlight the best value on the gym page and at checkout: *"Staying 4 days? The week pass saves $20."*
- **Done when**: with dates set, every gym with 2+ pass options shows the cheapest correct choice.

### Phase 8: Payments + front desk ⬜ *(when Sage says go)*
- Stripe test mode: create a purchase + PaymentIntent server-side, webhook → `fulfill_purchase(purchase_id)` with the service role, pass appears in Passes. Secrets go straight into hosting env vars, never in chat or the repo.
- `/desk` page for gym staff: scan or type a pass code → `validate_pass` → valid / expired. Restrict to `gym_staff` from Phase 6 (today any signed-in user can call `validate_pass`).
- **Done when**: test card 4242 4242 4242 4242 buys a day pass, the QR shows in Passes, Activate works, and the desk page validates it.

### Phase 9: Monetization ⬜
- Pick the model (see Decisions). Sponsored placement must be labeled and must not change nearest-first ordering of organic results. Revenue share needs Phase 8 + gym agreements.

## Open questions
- Payments server: Vercel functions (one deploy) vs Express `server.js` on Render (class template).
- Photo posts in the feed: later, only after reports/blocks prove workable.
- Account deletion (required for App Store release): before any store submission.

# DropSet app (Expo / React Native)

The DropSet traveler app for iOS, Android and the web from one codebase: find a gym near where you landed, filter by how you train, see the real price, and buy a day, week or month pass.

Stack: Expo SDK 58, Expo Router (file-based routes in `src/app`), TypeScript, Supabase (Postgres + Auth), Reanimated.

## Run it

```bash
cd mobile
npm install
cp .env.example .env.local      # Supabase URL + publishable key (safe to ship)
npx expo start
```

- **Phone:** install **Expo Go** (App Store / Play Store), then scan the QR code in the terminal (iPhone: Camera app). Phone and laptop must be on the same Wi-Fi. If they aren't (campus Wi-Fi often blocks it), run `npx expo start --tunnel`.
- **Browser:** press `w`, or open http://localhost:8081.

Before you push: `npx tsc --noEmit` and `npx expo lint` must both be clean.

## Where things live

```
src/app/                 every file is a screen (URL on web)
  index.tsx              welcome: photo wall + sign-in sheet
  (auth)/                login, signup, forgot-password, reset-password
  (tabs)/                explore, saved, passes, profile
  search.tsx             where + training style + price
  results.tsx            gyms within 30 mi, nearest first
  gym/[slug].tsx         gym profile + pass options
  checkout/[optionId].tsx  order summary (payments arrive with Stripe)
  pass/[id].tsx          QR pass + Activate
src/components/          UI kit: Button, TextField, Chip, Badge, GymCard, ...
src/lib/api.ts           EVERY Supabase call. Screens never query directly.
src/lib/database.types.ts  generated from the live schema
src/theme/tokens.ts      colors, type scale, spacing, radii, shadows
src/providers/           AuthProvider (session + profile), SavedProvider (hearts)
```

## Design rules (keep the app from looking generic)

- Use only `tokens.ts` values. No new hex codes in screens.
- Each color has one job. **Ember** = primary buttons and prices of 20px or more. **Cobalt** = selected chips, links, focus. **Mint** = an active pass, nothing else. Everything else is chalk, white and navy ink.
- Type: `<T v="…">` only. Bricolage Grotesque for titles and prices, Plus Jakarta Sans for everything else.
- Icons: `phosphor-react-native` only. Pressables: use `<Press>` (spring + haptic).
- Never fake data. No star ratings until we collect reviews. Missing price → "Price not listed".

## Data and security

- The app talks to Supabase with the **publishable** key. Row-level security decides what each user can see. Never put the secret/service_role key, the DB password or `JWT_SECRET` in this folder.
- Gym search is `search_gyms` (RPC). It returns everything a result card needs. Radius is 30 mi (48,280 m).
- Logged-out visitors can browse the gyms; saving, passes and profile need an account.
- After a schema change: regenerate `src/lib/database.types.ts` (command at the top of that file).

## Supabase dashboard setup (one time, project owner)

1. **Authentication → URL Configuration → Redirect URLs:** add `http://localhost:8081/**`, `exp://**`, `dropset://**`, and the Render URL once deployed (`https://<app>.onrender.com/**`). Password-reset and Google links only return to these.
2. **Authentication → Sign In / Providers → Email:** for the class demo, turn **Confirm email** off. The built-in mailer only sends a few emails per hour. Leave it on if you set up custom SMTP (for example Resend's free tier).
3. **Google sign-in (optional):** enable the Google provider with a Google Cloud OAuth client, then set `EXPO_PUBLIC_GOOGLE_AUTH=1`. Apple sign-in needs a paid Apple developer account, so it's left out.

## Deploy the web version (Render, free)

New **Static Site** from this repo:

- Build command: `cd mobile && npm ci && npx expo export -p web`
- Publish directory: `mobile/dist`
- Environment: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Redirects/Rewrites: `/*` → `/index.html` (Rewrite), so deep links like `/gym/phoenix-rock-gym` work.

## What's next (by build-plan feature)

| Feature | State | Next step |
|---|---|---|
| Gym search & discovery | Done: 210 gyms, 30-mile search, filters | Google Places autocomplete (store `place_id` only) |
| Gym profile pages | Done | Real gym photos in `gym_photos`, prices for more gyms |
| Pass purchase | Checkout screen built, Pay disabled | Express: Stripe PaymentIntent + webhook → `fulfill_purchase` |
| Accounts & profiles | Done (Supabase Auth) | Avatar upload |
| Digital pass & check-in | QR + Activate built | Gym-side scanner using `validate_pass` |

Credits: gym locations © OpenStreetMap contributors (ODbL). Placeholder photos from Unsplash.

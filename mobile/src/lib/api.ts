// Every call the app makes to Supabase lives here. Screens never build queries themselves.
// Reads of the gym catalog work logged out (RLS "catalog read"); user data is scoped by RLS to auth.uid().

import type { Enums, Json, Tables } from './database.types';
import { RADIUS_METERS } from './format';
import { supabase } from './supabase';

export type PassType = Enums<'pass_type'>;
export type PriceConfidence = Enums<'price_confidence'>;

// One row of search results (search_gyms). Nullable fields are nullable for real.
export type GymResult = {
  gym_id: string;
  slug: string;
  name: string;
  address_line1: string | null;
  city: string;
  lat: number | null;
  lng: number | null;
  distance_m: number | null;
  min_price_cents: number | null;
  min_price_pass_type: PassType | null;
  min_price_confidence: PriceConfidence | null;
  style_slugs: string[];
  amenity_slugs: string[];
  cover_photo_url: string | null;
  is_partner: boolean;
};

export type SearchParams = {
  lat: number;
  lng: number;
  styles?: string[];
  maxPriceCents?: number | null;
  pricedOnly?: boolean;
};

const ANY_PRICE = 2_147_483_647; // max int: "only gyms that list a price"

function fail(error: { message: string } | null): never | void {
  if (error) throw new Error(error.message);
}

export async function searchGyms(p: SearchParams): Promise<GymResult[]> {
  const { data, error } = await supabase.rpc('search_gyms', {
    p_lat: p.lat,
    p_lng: p.lng,
    p_radius_m: RADIUS_METERS,
    p_style_slugs: p.styles?.length ? p.styles : undefined,
    p_max_price_cents: p.maxPriceCents ?? (p.pricedOnly ? ANY_PRICE : undefined),
  });
  fail(error);
  return (data ?? []) as GymResult[];
}

export type PassOption = Tables<'pass_options'>;

export type GymDetail = Tables<'gyms'> & {
  pass_options: PassOption[];
  styles: { slug: string; name: string }[];
  amenities: { slug: string; name: string }[];
  photos: { url: string; caption: string | null }[];
};

export async function getGym(slug: string): Promise<GymDetail | null> {
  const { data, error } = await supabase
    .from('gyms')
    .select(
      '*, pass_options(*), gym_training_styles(training_styles(slug, name)), gym_amenities(amenities(slug, name)), gym_photos(url, caption, sort_order)',
    )
    .eq('slug', slug)
    .maybeSingle();
  fail(error);
  if (!data) return null;
  const { gym_training_styles, gym_amenities, gym_photos, pass_options, ...gym } = data;
  return {
    ...gym,
    pass_options: [...pass_options].sort((a, b) => a.price_cents - b.price_cents),
    styles: gym_training_styles.flatMap((r) => (r.training_styles ? [r.training_styles] : [])),
    amenities: gym_amenities.flatMap((r) => (r.amenities ? [r.amenities] : [])),
    photos: [...gym_photos].sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function getPassOption(id: string) {
  const { data, error } = await supabase
    .from('pass_options')
    .select('*, gyms(id, slug, name, city, address_line1)')
    .eq('id', id)
    .maybeSingle();
  fail(error);
  return data;
}

// ---------- signed-in user ----------

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  fail(error);
  return data;
}

export async function updateProfile(
  userId: string,
  patch: { display_name?: string; home_city?: string | null; avatar_url?: string | null },
) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  fail(error);
}

// One photo per user at avatars/{id}/avatar.jpg (storage policies only allow writing your own folder).
const avatarPath = (userId: string) => `${userId}/avatar.jpg`;

export async function uploadAvatar(userId: string, localUri: string) {
  const body = await fetch(localUri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage
    .from('avatars')
    .upload(avatarPath(userId), body, { contentType: 'image/jpeg', upsert: true });
  fail(error);
  const { publicUrl } = supabase.storage.from('avatars').getPublicUrl(avatarPath(userId)).data;
  await updateProfile(userId, { avatar_url: `${publicUrl}?v=${Date.now()}` }); // new URL so caches show the new photo
}

export async function removeAvatar(userId: string) {
  const { error } = await supabase.storage.from('avatars').remove([avatarPath(userId)]);
  fail(error);
  await updateProfile(userId, { avatar_url: null });
}

export async function getSavedGymIds(): Promise<string[]> {
  const { data, error } = await supabase.from('saved_gyms').select('gym_id');
  fail(error);
  return (data ?? []).map((r) => r.gym_id);
}

export async function setSaved(userId: string, gymId: string, saved: boolean) {
  const { error } = saved
    ? await supabase.from('saved_gyms').insert({ user_id: userId, gym_id: gymId })
    : await supabase.from('saved_gyms').delete().eq('user_id', userId).eq('gym_id', gymId);
  fail(error);
}

// Saved gyms shaped like search results so the same card renders them.
export async function getSavedGyms(): Promise<GymResult[]> {
  const { data, error } = await supabase
    .from('saved_gyms')
    .select(
      'created_at, gyms(id, slug, name, address_line1, city, lat, lng, is_partner, gym_training_styles(training_styles(slug)), gym_amenities(amenities(slug)), gym_photos(url, sort_order), pass_options(price_cents, pass_type, price_confidence, is_active))',
    )
    .order('created_at', { ascending: false });
  fail(error);
  return (data ?? []).flatMap(({ gyms: g }) => {
    if (!g) return [];
    const cheapest = g.pass_options.filter((o) => o.is_active).sort((a, b) => a.price_cents - b.price_cents)[0];
    const cover = [...g.gym_photos].sort((a, b) => a.sort_order - b.sort_order)[0];
    return [
      {
        gym_id: g.id,
        slug: g.slug,
        name: g.name,
        address_line1: g.address_line1,
        city: g.city,
        lat: g.lat,
        lng: g.lng,
        distance_m: null,
        min_price_cents: cheapest?.price_cents ?? null,
        min_price_pass_type: cheapest?.pass_type ?? null,
        min_price_confidence: cheapest?.price_confidence ?? null,
        style_slugs: g.gym_training_styles.flatMap((r) => (r.training_styles ? [r.training_styles.slug] : [])),
        amenity_slugs: g.gym_amenities.flatMap((r) => (r.amenities ? [r.amenities.slug] : [])),
        cover_photo_url: cover?.url ?? null,
        is_partner: g.is_partner,
      },
    ];
  });
}

export type PassWithGym = Tables<'passes'> & { gyms: { name: string; slug: string; city: string } | null };

export async function getPasses(): Promise<PassWithGym[]> {
  const { data, error } = await supabase
    .from('passes')
    .select('*, gyms(name, slug, city)')
    .order('created_at', { ascending: false });
  fail(error);
  return data ?? [];
}

export async function getPass(id: string): Promise<PassWithGym | null> {
  const { data, error } = await supabase.from('passes').select('*, gyms(name, slug, city)').eq('id', id).maybeSingle();
  fail(error);
  return data;
}

// ---------- checkout + front desk ----------

// Simulated payment for the demo: records a purchase and issues the pass. Returns the new pass id.
export async function demoCheckout(optionId: string): Promise<string> {
  const { data, error } = await supabase.rpc('demo_checkout', { p_option_id: optionId });
  fail(error);
  return data as string;
}

export type StaffGym = { id: string; name: string; city: string; slug: string };

export async function getStaffGyms(): Promise<StaffGym[]> {
  const { data, error } = await supabase.from('gym_staff').select('gyms(id, name, city, slug)').order('created_at');
  fail(error);
  return (data ?? []).flatMap((r) => (r.gyms ? [r.gyms] : []));
}

export type CheckInResult = 'checked_in' | 'already_in' | 'expired' | 'cancelled' | 'not_found';

export type DeskResult = {
  result: CheckInResult;
  pass_type: PassType | null;
  duration_days: number | null;
  expires_at: string | null;
  holder_name: string | null;
  holder_avatar: string | null;
  checked_in_at: string | null;
};

// Staff scan (full QR value) or type (8-character code). Starting the pass happens here, at the desk.
export async function deskCheckIn(gymId: string, code: string): Promise<DeskResult> {
  const { data, error } = await supabase.rpc('desk_check_in', { p_gym_id: gymId, p_code: code });
  fail(error);
  return (data as DeskResult[])[0];
}

export type DeskStats = {
  today: number;
  week: number;
  month: number;
  visitors: number;
  new: number;
  passes_sold: number;
  revenue_cents: number;
  recent: { at: string; name: string; pass_type: PassType }[];
};

export async function getDeskStats(gymId: string): Promise<DeskStats> {
  const { data, error } = await supabase.rpc('desk_stats', { p_gym_id: gymId });
  fail(error);
  return data as unknown as DeskStats;
}

// ---------- reviews (1-5 dumbbells, 40 words) ----------

export const REVIEW_MAX_WORDS = 40;

export type Review = {
  id: string;
  rating: number;
  body: string;
  is_sample: boolean; // placeholder: no author, always labeled "Sample" in the UI
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
  is_mine: boolean;
};

export type ReviewSummary = { average: number | null; count: number; samples: number };

// The rating is the average of the reviews on the page, samples included (the UI says how many are samples).
// Samples drop out on their own once a gym has 3 member reviews.
export async function getReviews(gymId: string): Promise<{ reviews: Review[]; summary: ReviewSummary }> {
  const { data, error } = await supabase.rpc('gym_reviews_for', { p_gym_id: gymId });
  fail(error);
  const reviews = (data ?? []) as Review[];
  const average = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
  return { reviews, summary: { average, count: reviews.length, samples: reviews.filter((r) => r.is_sample).length } };
}

// One review per person per gym: posting again replaces your earlier review.
export async function saveReview(userId: string, gymId: string, rating: number, body: string) {
  const { error } = await supabase
    .from('gym_reviews')
    .upsert({ user_id: userId, gym_id: gymId, rating, body: body.trim() }, { onConflict: 'gym_id,user_id' });
  fail(error);
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from('gym_reviews').delete().eq('id', id);
  fail(error);
}

export async function reportReview(userId: string, reviewId: string) {
  const { error } = await supabase.from('review_reports').insert({ review_id: reviewId, reporter_id: userId });
  if (error && error.code !== '23505') fail(error); // already reported counts as done
}

export type HoursJson = Record<string, string>;
export const asHours = (h: Json | null) => (h && typeof h === 'object' && !Array.isArray(h) ? (h as HoursJson) : null);

// Placeholder photography until gyms upload their own (public.gym_photos).
// All images are from Unsplash under the Unsplash License (free to use, credit appreciated).
// A gym gets a stable photo picked from its first training style, so cards don't shuffle.

const POOL: Record<string, string[]> = {
  powerlifting: ['1558611848-73f7eb4001a1', '1709315847224-6c8a812e886a', '1620188526357-ff08e03da266', '1709315957145-a4bad1feef28'],
  crossfit: ['1614091245074-bbf4d04a3c32', '1614091245692-518677e52f29', '1536922246289-88c42f957773', '1517836357463-d25dfeac3438'],
  climbing: ['1564769662533-4f00a87b4056', '1696105538782-7815474f28e0', '1689775884478-9ed19b79d659', '1730659071194-4c833ac5da4e'],
  general_fitness: [
    '1689877020200-403d8542d95d',
    '1757924284732-4189190321cf',
    '1671970922029-0430d2ae122c',
    '1685633224767-361354e84e2b',
    '1767531309781-b61fe1edfe86',
    '1758957646695-ec8bce3df462',
    '1778828494354-9b717d36dc99',
    '1685633225077-820d5c7eb123',
    '1651340048650-9bb75627f3de',
  ],
  group_fitness: ['1517130038641-a774d04afb3c', '1554284126-aa88f22d8b74', '1518310383802-640c2de311b2'],
  functional_training: ['1758875570600-8daf8d2f05f3', '1632077804406-188472f1a810', '1599058917212-d750089bc07e'],
  olympic_weightlifting: ['1541534741688-6078c6bfb5c5', '1772450014622-1c209d012c2e', '1605296867304-46d5465a13f1'],
  bodybuilding: ['1517838277536-f5f99be501cd', '1590150392093-a552544eed09', '1606335544665-96055053b5c0'],
  recovery_wellness: ['1757940661240-f2e8d2ff93bf', '1717356495389-6ab1e5ff9d84'],
};

// Wall of photos behind the welcome screen.
export const SPLASH_ROWS = [
  ['1558611848-73f7eb4001a1', '1564769662533-4f00a87b4056', '1614091245074-bbf4d04a3c32', '1757924284732-4189190321cf', '1758875570600-8daf8d2f05f3'],
  ['1709315847224-6c8a812e886a', '1696105538782-7815474f28e0', '1689877020200-403d8542d95d', '1541534741688-6078c6bfb5c5', '1517130038641-a774d04afb3c'],
  ['1614091245692-518677e52f29', '1772450014622-1c209d012c2e', '1730659071194-4c833ac5da4e', '1632077804406-188472f1a810', '1709315957145-a4bad1feef28'],
];

export const unsplash = (id: string, width = 600) =>
  `https://images.unsplash.com/photo-${id}?w=${width}&q=70&auto=format&fit=crop`;

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function photo(seed: string, style: string | undefined, width = 600) {
  const pool = POOL[style ?? ''] ?? POOL.general_fitness;
  return unsplash(pool[hash(seed) % pool.length], width);
}

// Real photo when the gym has one, otherwise a style-matched placeholder.
export function gymPhoto(gym: { slug: string; cover_photo_url?: string | null; style_slugs?: string[] }, width = 600) {
  if (gym.cover_photo_url) return gym.cover_photo_url;
  const styles = gym.style_slugs ?? [];
  // Prefer the most specific style over "general" so a CrossFit box doesn't get a treadmill.
  const style = styles.find((s) => s !== 'general_fitness') ?? styles[0];
  return photo(gym.slug, style, width);
}

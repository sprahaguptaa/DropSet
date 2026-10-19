// Places a traveler can search from. Coordinates from OpenStreetMap Nominatim (2026-10-18).
// Swap for Google Places Autocomplete once we have an API key (store only place_id long term).

export type Place = { id: string; label: string; detail: string; lat: number; lng: number; kind: 'city' | 'airport' | 'campus' };

export const PLACES: Place[] = [
  { id: 'phoenix', label: 'Phoenix', detail: 'City in Arizona', lat: 33.4484, lng: -112.0741, kind: 'city' },
  { id: 'tempe', label: 'Tempe', detail: 'City in Arizona', lat: 33.4255, lng: -111.94, kind: 'city' },
  { id: 'scottsdale', label: 'Scottsdale', detail: 'City in Arizona', lat: 33.4942, lng: -111.926, kind: 'city' },
  { id: 'phx', label: 'Phoenix Sky Harbor (PHX)', detail: 'Airport', lat: 33.4328, lng: -112.0068, kind: 'airport' },
  { id: 'asu', label: 'Arizona State University', detail: 'Tempe campus', lat: 33.4213, lng: -111.9332, kind: 'campus' },
  { id: 'mesa', label: 'Mesa', detail: 'City in Arizona', lat: 33.4151, lng: -111.8315, kind: 'city' },
  { id: 'chandler', label: 'Chandler', detail: 'City in Arizona', lat: 33.3062, lng: -111.8412, kind: 'city' },
  { id: 'gilbert', label: 'Gilbert', detail: 'Town in Arizona', lat: 33.3528, lng: -111.789, kind: 'city' },
  { id: 'glendale', label: 'Glendale', detail: 'City in Arizona', lat: 33.5387, lng: -112.186, kind: 'city' },
  { id: 'peoria', label: 'Peoria', detail: 'City in Arizona', lat: 33.5806, lng: -112.2373, kind: 'city' },
];

export const DEFAULT_PLACE = PLACES[0];

export function findPlaces(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return PLACES;
  return PLACES.filter((p) => p.label.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q) || p.id === q);
}

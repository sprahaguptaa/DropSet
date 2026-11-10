const METERS_PER_MILE = 1609.344;

export const RADIUS_MILES = 30;
export const RADIUS_METERS = Math.round(RADIUS_MILES * METERS_PER_MILE);

export function money(cents: number) {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

export function miles(meters: number | null | undefined) {
  if (meters == null) return null;
  const mi = meters / METERS_PER_MILE;
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export const PASS_UNIT = { day: 'day', week: 'week', month: 'month' } as const;

export function passLength(days: number) {
  if (days === 1) return '1 day';
  if (days % 30 === 0) return days === 30 ? '30 days' : `${days / 30} months`;
  if (days % 7 === 0) return days === 7 ? '7 days' : `${days / 7} weeks`;
  return `${days} days`;
}

// OSM opening_hours ("Mo-Fr 05:00-22:00; Sa,Su 07:00-19:00") -> readable lines.
const DAY = { Mo: 'Mon', Tu: 'Tue', We: 'Wed', Th: 'Thu', Fr: 'Fri', Sa: 'Sat', Su: 'Sun', PH: 'Holidays' } as const;

export function hoursLines(hours: Record<string, string> | null | undefined): string[] {
  if (!hours) return [];
  if (hours.text) {
    if (hours.text.trim() === '24/7') return ['Open 24 hours, every day'];
    return hours.text
      .split(/;\s*/)
      .filter((part) => part && !/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|easter)\b/i.test(part))
      .slice(0, 4)
      .map((part) => part.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (d) => DAY[d as keyof typeof DAY]).replace(/-/g, '–'));
  }
  const label: Record<string, string> = { all: 'Every day', 'mon-fri': 'Mon–Fri', 'sat-sun': 'Sat–Sun' };
  return Object.entries(hours).map(([k, v]) => `${label[k] ?? k}  ${v.replace(/-/g, '–')}`);
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function shortDate(iso: string) {
  // A plain date ("2026-10-14") is a calendar day, not UTC midnight, or Arizona would show the 13th.
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const date = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(iso);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// The person's own calendar day as YYYY-MM-DD (daily logs are per local day, not UTC).
export function localDate(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Monday..Sunday of the week containing `day` (YYYY-MM-DD).
export function weekDates(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const monday = new Date(y, m - 1, d - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => localDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));
}

export function streakLabel(days: number) {
  return days ? `${days} day${days === 1 ? '' : 's'} strong` : 'Log today to start a streak';
}

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3.6e6);
  if (h >= 48) return `${Math.floor(h / 24)} days left`;
  if (h >= 1) return `${h}h ${Math.floor((ms % 3.6e6) / 6e4)}m left`;
  return `${Math.max(1, Math.floor(ms / 6e4))} min left`;
}

export function wordCount(text: string) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

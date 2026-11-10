import { Barbell, Mountains, Scales, type Icon } from 'phosphor-react-native';

// Mirrors the checks on public.goals. Order = how they appear in the New goal form.
export const GOAL_KINDS = [
  { kind: 'lift', label: 'Lift', icon: Barbell },
  { kind: 'bodyweight', label: 'Bodyweight', icon: Scales },
  { kind: 'climb', label: 'Climbing grade', icon: Mountains },
] as const satisfies readonly { kind: string; label: string; icon: Icon }[];

export const LIFTS = [
  { lift: 'squat', label: 'Squat' },
  { lift: 'bench', label: 'Bench' },
  { lift: 'deadlift', label: 'Deadlift' },
  { lift: 'press', label: 'Overhead press' },
] as const;

export type GoalKind = (typeof GOAL_KINDS)[number]['kind'];
export type Lift = (typeof LIFTS)[number]['lift'];
export type WeightUnit = 'lb' | 'kg';

type GoalLike = { kind: string; lift: string | null; unit: string; start_value: number; target_value: number; achieved_at: string | null };
type EntryLike = { value: number; logged_on: string; created_at: string };

export const goalKindOf = (kind: string) => GOAL_KINDS.find((k) => k.kind === kind) ?? GOAL_KINDS[0];
const liftLabel = (lift: string | null) => LIFTS.find((l) => l.lift === lift)?.label ?? 'Lift';

// 405 -> "405 lb", 184.5 -> "184.5 lb", climbing 6 -> "V6"
export function formatValue(value: number, unit: string) {
  if (unit === 'v') return `V${Math.round(value)}`;
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`;
}

export function goalTitle(g: GoalLike) {
  if (g.kind === 'lift') return `${liftLabel(g.lift)} ${formatValue(g.target_value, g.unit)}`;
  if (g.kind === 'climb') return `Climb ${formatValue(g.target_value, g.unit)}`;
  return `Bodyweight ${formatValue(g.target_value, g.unit)}`;
}

// What the goal is about, for prompts: "Deadlift", "Bodyweight", "Top climbing grade".
export function goalSubject(g: GoalLike) {
  if (g.kind === 'lift') return liftLabel(g.lift);
  return g.kind === 'climb' ? 'Top climbing grade' : 'Bodyweight';
}

// Lifts and grades count your best; bodyweight counts your latest weigh-in.
export function goalProgress(g: GoalLike, entries: EntryLike[]) {
  const latestFirst = [...entries].sort((a, b) => (b.logged_on + b.created_at).localeCompare(a.logged_on + a.created_at));
  const current =
    g.kind === 'bodyweight'
      ? (latestFirst[0]?.value ?? g.start_value)
      : Math.max(g.start_value, ...entries.map((e) => e.value));
  const span = g.target_value - g.start_value;
  const pct = g.achieved_at ? 1 : Math.min(1, Math.max(0, (current - g.start_value) / span));
  return { current, pct };
}

// Parse a typed number ("184.5", "405", "V6") into a value the database accepts, or null.
export function parseValue(text: string, unit: string) {
  const s = text.trim().replace(/^v/i, '').replace(',', '.');
  if (!/^d+(.d+)?$/.test(s)) return null;
  const n = Number(s);
  if (unit === 'v') return Number.isInteger(n) && n <= 17 ? n : null;
  return n <= 2000 ? Math.round(n * 10) / 10 : null;
}

// What to tell someone whose typed value doesn't parse (null when it's blank or fine).
export function valueError(text: string, unit: string) {
  if (!text.trim() || parseValue(text, unit) != null) return null;
  return unit === 'v' ? 'A whole V grade from 0 to 17' : `A number up to 2000 ${unit}`;
}

// Friendlier text for the database's checks on an entry.
export function entryError(e: unknown) {
  const m = (e as Error)?.message ?? '';
  if (m.includes('too far')) return 'That weigh-in is far from your starting weight. Check the number.';
  if (m.includes('climbing grades')) return 'Climbing grades are whole numbers from 0 to 17.';
  return 'Couldn’t save. Try again.';
}

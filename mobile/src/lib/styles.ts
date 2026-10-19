import {
  Barbell,
  Drop,
  Fire,
  Heartbeat,
  Lightning,
  Medal,
  Mountains,
  Trophy,
  UsersThree,
  type Icon,
} from 'phosphor-react-native';

import { photo } from './photos';

// Mirrors public.training_styles (seed.sql). Order = how they appear in the app.
export const STYLES = [
  { slug: 'powerlifting', name: 'Powerlifting', short: 'Powerlifting', icon: Barbell },
  { slug: 'crossfit', name: 'CrossFit', short: 'CrossFit', icon: Fire },
  { slug: 'general_fitness', name: 'General Fitness', short: 'General', icon: Heartbeat },
  { slug: 'climbing', name: 'Climbing / Bouldering', short: 'Climbing', icon: Mountains },
  { slug: 'olympic_weightlifting', name: 'Olympic Weightlifting', short: 'Olympic lifting', icon: Medal },
  { slug: 'functional_training', name: 'Functional Training', short: 'Functional', icon: Lightning },
  { slug: 'group_fitness', name: 'Group Fitness', short: 'Group classes', icon: UsersThree },
  { slug: 'bodybuilding', name: 'Bodybuilding', short: 'Bodybuilding', icon: Trophy },
  { slug: 'recovery_wellness', name: 'Recovery & Wellness', short: 'Recovery', icon: Drop },
] as const satisfies readonly { slug: string; name: string; short: string; icon: Icon }[];

export type StyleSlug = (typeof STYLES)[number]['slug'];

const bySlug = new Map<string, (typeof STYLES)[number]>(STYLES.map((s) => [s.slug, s]));

export const styleOf = (slug: string) => bySlug.get(slug);
export const styleName = (slug: string) => bySlug.get(slug)?.short ?? slug.replace(/_/g, ' ');

export function stylePhoto(slug: string, width = 600) {
  return photo(slug, slug, width);
}

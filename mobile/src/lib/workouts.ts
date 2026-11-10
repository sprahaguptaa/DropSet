import { Barbell, Basketball, Moon, Mountains, PersonSimpleRun, UsersThree, type Icon } from 'phosphor-react-native';

// Mirrors the check on public.workouts.kind. Order = how they appear on the log screen.
export const WORKOUT_KINDS = [
  { kind: 'lift', label: 'Lift', past: 'Lifted', icon: Barbell },
  { kind: 'climb', label: 'Climb', past: 'Climbed', icon: Mountains },
  { kind: 'class', label: 'Class', past: 'Took a class', icon: UsersThree },
  { kind: 'cardio', label: 'Cardio', past: 'Did cardio', icon: PersonSimpleRun },
  { kind: 'sport', label: 'Sport', past: 'Played a sport', icon: Basketball },
  { kind: 'rest', label: 'Rest day', past: 'Rest day', icon: Moon },
] as const satisfies readonly { kind: string; label: string; past: string; icon: Icon }[];

export type WorkoutKind = (typeof WORKOUT_KINDS)[number]['kind'];

export const kindOf = (kind: string) => WORKOUT_KINDS.find((k) => k.kind === kind) ?? WORKOUT_KINDS[0];

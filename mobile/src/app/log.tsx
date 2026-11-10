import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { back, ScreenHeader, ScrollScreen } from '@/components/layout';
import { Press } from '@/components/Press';
import { T } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { deleteWorkout, getPasses, getSavedGyms, getWorkouts, saveWorkout, type Workout } from '@/lib/api';
import { localDate, shortDate } from '@/lib/format';
import { WORKOUT_KINDS, type WorkoutKind } from '@/lib/workouts';
import { useAuth } from '@/providers/AuthProvider';
import { color, font, layout, radius, space } from '@/theme/tokens';

type GymOption = { id: string; name: string };

// Gyms you'd likely be at: ones you saved and ones you hold a current pass for.
async function gymOptions(): Promise<GymOption[]> {
  const [saved, passes] = await Promise.all([getSavedGyms(), getPasses()]);
  const all = [
    ...passes.filter((p) => p.status !== 'expired' && p.status !== 'cancelled' && p.gyms).map((p) => ({ id: p.gym_id, name: p.gyms!.name })),
    ...saved.map((g) => ({ id: g.gym_id, name: g.name })),
  ];
  return all.filter((g, i) => all.findIndex((x) => x.id === g.id) === i).slice(0, 8);
}

function LogForm({ userId, today, existing, gyms }: { userId: string; today: string; existing: Workout | null; gyms: GymOption[] }) {
  const [kind, setKind] = useState<WorkoutKind | null>((existing?.kind as WorkoutKind) ?? null);
  const [gymId, setGymId] = useState<string | null>(existing?.gym_id ?? null);
  const [note, setNote] = useState(existing?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A gym from an older log that's no longer saved still shows as an option.
  const options = existing?.gym_id && existing.gyms && !gyms.some((g) => g.id === existing.gym_id)
    ? [{ id: existing.gym_id, name: existing.gyms.name }, ...gyms]
    : gyms;

  async function run(task: () => Promise<void>) {
    setSaving(true);
    setError(null);
    try {
      await task();
      back();
    } catch {
      setError('Couldn’t save. Check your connection and try again.');
      setSaving(false);
    }
  }

  const save = () => run(() => saveWorkout(userId, { logged_on: today, kind: kind!, gym_id: kind === 'rest' ? null : gymId, note }));
  const remove = () => (confirmDelete ? run(() => deleteWorkout(existing!.id)) : setConfirmDelete(true));

  return (
    <>
      <View style={styles.block}>
        <T v="title3">What did you do?</T>
        <View style={styles.kinds} accessibilityRole="radiogroup" accessibilityLabel="What did you do?">
          {WORKOUT_KINDS.map((k) => {
            const on = kind === k.kind;
            return (
              <Press
                key={k.kind}
                onPress={() => setKind(k.kind)}
                scaleTo={0.96}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={[styles.kind, on && styles.kindOn]}>
                <k.icon size={26} color={on ? color.cobalt : color.ink} weight={on ? 'fill' : 'regular'} />
                <T v="callout" c={on ? 'cobalt' : 'ink'} style={styles.bold}>
                  {k.label}
                </T>
              </Press>
            );
          })}
        </View>
      </View>

      {kind !== 'rest' && (
        <View style={styles.block}>
          <T v="title3">Where?</T>
          {options.length ? (
            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Where?">
              {options.map((g) => (
                <Chip key={g.id} label={g.name} role="radio" selected={gymId === g.id} onPress={() => setGymId(gymId === g.id ? null : g.id)} />
              ))}
            </View>
          ) : null}
          <T v="footnote" c="muted">
            Optional. Gyms you’ve saved or hold a pass for show up here.
          </T>
        </View>
      )}

      <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="Squats 5×5, felt strong" maxLength={140} />

      {error && (
        <T v="callout" c="danger">
          {error}
        </T>
      )}
      <Button label={existing ? 'Save changes' : 'Log it'} onPress={save} loading={saving} disabled={!kind} />
      {existing && (
        <Press onPress={remove} disabled={saving} haptic={false} accessibilityRole="button" style={styles.delete}>
          <T v="callout" c="danger" style={styles.bold}>
            {confirmDelete ? 'Tap again to delete today’s log' : 'Delete today’s log'}
          </T>
        </Press>
      )}
    </>
  );
}

// Log today in two taps: what you did, then Log it.
export default function LogToday() {
  const { ready, session } = useAuth();
  const userId = session?.user.id ?? null;
  const [today] = useState(() => localDate());
  // failed: today's entry couldn't be read. Never show an empty form then, or saving would overwrite it.
  const [loaded, setLoaded] = useState<{ userId: string; existing: Workout | null; gyms: GymOption[]; failed: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    Promise.all([getWorkouts(today, today), gymOptions().catch(() => [])])
      .then(([w, gyms]) => setLoaded({ userId, existing: w[0] ?? null, gyms, failed: false }))
      .catch(() => setLoaded({ userId, existing: null, gyms: [], failed: true }));
  }, [userId, today, attempt]);

  if (ready && !session) return <Redirect href={{ pathname: '/login', params: { next: '/log' } }} />;
  const current = loaded?.userId === userId ? loaded : null;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={current?.existing ? 'Edit today' : 'Log today'} subtitle={shortDate(today)} close width={layout.form} />
      {!current || !userId ? (
        <ActivityIndicator color={color.ink} style={{ marginTop: space.huge }} />
      ) : current.failed ? (
        <ScrollScreen width={layout.form} gap={space.l}>
          <T v="callout" c="danger">
            Couldn’t load today’s log. Check your connection.
          </T>
          <Button label="Try again" variant="outline" size="m" onPress={() => setAttempt((a) => a + 1)} />
        </ScrollScreen>
      ) : (
        <ScrollScreen width={layout.form} gap={space.xxl}>
          <LogForm key={current.existing?.id ?? 'new'} userId={userId} today={today} existing={current.existing} gyms={current.gyms} />
        </ScrollScreen>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  bold: { fontFamily: font.bold },
  block: { gap: space.m },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  kind: {
    flexBasis: '30%',
    flexGrow: 1,
    height: 88,
    borderRadius: radius.l,
    borderWidth: 1.5,
    borderColor: color.line,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  kindOn: { borderColor: color.cobalt, backgroundColor: color.cobaltTint },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  delete: { alignSelf: 'center', padding: space.s },
});

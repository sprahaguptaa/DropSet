import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { updateProfile, type TrainingMode } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { color, radius, shadow, space } from '@/theme/tokens';

import { Button } from './Button';
import { Chip } from './Chip';
import { T } from './Text';

function useSetMode() {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function set(mode: TrainingMode) {
    if (!auth.session) return;
    setBusy(true);
    setError(null);
    try {
      await updateProfile(auth.session.user.id, { training_mode: mode });
      await auth.refreshProfile();
    } catch {
      setError('Couldn’t save that. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  return { mode: auth.profile?.training_mode ?? null, set, busy, error };
}

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <T v="footnote" c="danger">
      {error}
    </T>
  ) : null;
}

// Asked once (new and existing accounts): daily trainers get the Today card at the top of Explore.
export function TrainingModePrompt() {
  const { profile } = useAuth();
  const { set, busy, error } = useSetMode();
  if (!profile || profile.training_mode) return null;
  return (
    <View style={[styles.card, shadow.card]}>
      <T v="overline" c="muted">
        Quick question
      </T>
      <T v="title3">Do you train most days?</T>
      <T v="callout" c="muted">
        We’ll keep your daily log up front. You can change this in Profile.
      </T>
      <View style={styles.row}>
        <Button label="Most days" variant="dark" size="m" disabled={busy} onPress={() => set('daily')} style={styles.flex} />
        <Button label="When I travel" variant="outline" size="m" disabled={busy} onPress={() => set('traveler')} style={styles.flex} />
      </View>
      <ErrorLine error={error} />
    </View>
  );
}

// The same choice, changeable any time from Profile.
export function TrainingModeSetting() {
  const { mode, set, busy, error } = useSetMode();
  return (
    <View style={styles.setting}>
      <T v="headline">How you use DropSet</T>
      <View style={styles.chips} accessibilityRole="radiogroup">
        <Chip label="I train most days" role="radio" selected={mode === 'daily'} disabled={busy} onPress={() => set('daily')} />
        <Chip label="Mostly when I travel" role="radio" selected={mode === 'traveler'} disabled={busy} onPress={() => set('traveler')} />
      </View>
      <ErrorLine error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { backgroundColor: color.card, borderRadius: radius.l, padding: space.l, gap: space.s },
  row: { flexDirection: 'row', gap: space.m, marginTop: space.s },
  setting: { gap: space.m },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
});

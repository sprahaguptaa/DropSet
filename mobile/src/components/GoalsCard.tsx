import { router, useFocusEffect } from 'expo-router';
import { CaretRight, Target } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getGoals, type Goal } from '@/lib/api';
import { formatValue, goalProgress, goalTitle } from '@/lib/goals';
import { useAuth } from '@/providers/AuthProvider';
import { color, radius, shadow, space } from '@/theme/tokens';

import { Button } from './Button';
import { Press } from './Press';
import { ProgressBar } from './ProgressBar';
import { T } from './Text';

const openGoals = () => router.push('/goals');

// Profile summary: up to three open goals with progress; opens the Goals page.
export function GoalsCard() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [loaded, setLoaded] = useState<{ userId: string; goals: Goal[] | null } | null>(null);
  const load = useCallback(() => {
    if (!userId) return;
    getGoals()
      .then((goals) => setLoaded({ userId, goals }))
      .catch(() => setLoaded((prev) => (prev?.userId === userId && prev.goals ? prev : { userId, goals: null })));
  }, [userId]);

  useFocusEffect(load);

  const current = loaded?.userId === userId ? loaded : null;
  const goals = current?.goals ?? null;
  const open = goals?.filter((g) => !g.achieved_at) ?? [];
  const hitCount = (goals?.length ?? 0) - open.length;

  let body;
  if (!current) {
    body = <ActivityIndicator color={color.ink} />;
  } else if (!goals) {
    body = (
      <View style={styles.row}>
        <T v="callout" c="muted" style={styles.flex}>
          Couldn’t load your goals.
        </T>
        <Button label="Try again" variant="outline" size="s" onPress={load} />
      </View>
    );
  } else if (open.length === 0) {
    body = (
      <View style={styles.row}>
        <Target size={22} color={color.ink} />
        <T v="callout" c="muted" style={styles.flex}>
          {hitCount ? 'Every goal hit. Set the next one.' : 'Set a target for a lift, your bodyweight or a climbing grade.'}
        </T>
        <Button label="Set a goal" variant="outline" size="s" onPress={openGoals} />
      </View>
    );
  } else {
    body = open.slice(0, 3).map((g) => {
      const { current: now, pct } = goalProgress(g, g.goal_entries);
      return (
        <Press
          key={g.id}
          onPress={openGoals}
          haptic={false}
          scaleTo={0.99}
          accessibilityRole="link"
          accessibilityLabel={`${goalTitle(g)}, now ${formatValue(now, g.unit)}, ${Math.round(pct * 100)} percent`}
          style={styles.goal}>
          <View style={styles.titleRow}>
            <T v="headline" style={styles.flex} numberOfLines={1}>
              {goalTitle(g)}
            </T>
            <T v="footnote" c="muted">
              {formatValue(now, g.unit)}
            </T>
          </View>
          <ProgressBar pct={pct} label={`${goalTitle(g)} progress`} height={6} />
        </Press>
      );
    });
  }

  return (
    <View style={[styles.card, shadow.card]}>
      <Press onPress={openGoals} haptic={false} accessibilityRole="link" accessibilityLabel="Goals" style={styles.head}>
        <View style={styles.flex}>
          <T v="title3">Goals</T>
          {hitCount > 0 && (
            <T v="footnote" c="muted">
              {hitCount} hit so far
            </T>
          )}
        </View>
        <CaretRight size={18} color={color.muted} weight="bold" />
      </Press>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { backgroundColor: color.card, borderRadius: radius.l, padding: space.l, gap: space.l },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  goal: { gap: space.s },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.m },
});

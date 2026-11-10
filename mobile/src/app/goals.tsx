import * as Haptics from 'expo-haptics';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Plus, Target, Trophy, X } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState, ScreenHeader, ScrollScreen } from '@/components/layout';
import { Press } from '@/components/Press';
import { ProgressBar } from '@/components/ProgressBar';
import { T } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { addGoalEntry, createGoal, deleteGoal, deleteGoalEntry, getGoals, type Goal } from '@/lib/api';
import { localDate, shortDate } from '@/lib/format';
import {
  entryError,
  formatValue,
  GOAL_KINDS,
  goalKindOf,
  goalProgress,
  goalTitle,
  LIFTS,
  parseValue,
  valueError,
  type GoalKind,
  type Lift,
  type WeightUnit,
} from '@/lib/goals';
import { useAuth } from '@/providers/AuthProvider';
import { color, font, layout, radius, shadow, space } from '@/theme/tokens';

// Floats above the list so it's seen wherever you scrolled to.
function HitBanner({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hitWrap, { bottom: insets.bottom + space.l }]} pointerEvents="box-none">
      <View style={[styles.hit, shadow.float]} accessibilityLiveRegion="polite">
        <Trophy size={32} color={color.onDark} weight="fill" />
        <View style={styles.flex}>
          <T v="overline" c="onDarkMuted">
            Goal hit
          </T>
          <T v="title3" c="onDark">
            {goalTitle(goal)}
          </T>
          <T v="callout" c="onDarkMuted">
            That’s the work paying off. Set the next one when you’re ready.
          </T>
        </View>
        <Press onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss">
          <X size={18} color={color.onDark} weight="bold" />
        </Press>
      </View>
    </View>
  );
}

function EntryRow({ value, unit, day, onDelete, busy }: { value: number; unit: string; day: string; onDelete: () => void; busy: boolean }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <View style={styles.entry}>
      <T v="callout" c="ink2" style={styles.flex}>
        {formatValue(value, unit)}
      </T>
      <T v="footnote" c="muted">
        {shortDate(day)}
      </T>
      <Press
        onPress={() => (confirm ? onDelete() : setConfirm(true))}
        disabled={busy}
        hitSlop={10}
        haptic={false}
        accessibilityRole="button"
        accessibilityLabel={confirm ? `Confirm delete ${formatValue(value, unit)}` : `Delete ${formatValue(value, unit)} entry`}
        style={styles.entryDelete}>
        {confirm ? (
          <T v="footnote" c="danger" style={styles.bold}>
            Delete?
          </T>
        ) : (
          <X size={16} color={color.muted} weight="bold" />
        )}
      </Press>
    </View>
  );
}

function GoalCard({ goal, userId, onChanged, onHit }: { goal: Goal; userId: string; onChanged: () => void; onHit: (id: string) => void }) {
  const [logging, setLogging] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { current, pct } = goalProgress(goal, goal.goal_entries);
  const value = parseValue(text, goal.unit);
  const k = goalKindOf(goal.kind);
  const hit = !!goal.achieved_at;
  const recent = [...goal.goal_entries].sort((a, b) => (b.logged_on + b.created_at).localeCompare(a.logged_on + a.created_at)).slice(0, 3);

  async function run(task: () => Promise<void>, failText = 'Couldn’t save. Try again.') {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(failText === 'entry' ? entryError(e) : failText);
    } finally {
      setBusy(false);
    }
  }

  const log = () =>
    run(async () => {
      const r = await addGoalEntry(userId, goal.id, value!, localDate());
      setText('');
      setLogging(false);
      if (r.hit) onHit(goal.id);
      onChanged();
    }, 'entry');

  return (
    <View style={[styles.card, shadow.card]}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          {hit ? <Trophy size={20} color={color.ink} weight="fill" /> : <k.icon size={20} color={color.ink} weight="bold" />}
        </View>
        <View style={styles.flex}>
          <T v="headline">{goalTitle(goal)}</T>
          <T v="footnote" c="muted">
            {hit
              ? `Hit ${shortDate(goal.achieved_at!)} · started at ${formatValue(goal.start_value, goal.unit)}`
              : `Now ${formatValue(current, goal.unit)} · started at ${formatValue(goal.start_value, goal.unit)}`}
          </T>
        </View>
        {!hit && <T v="headline">{Math.round(pct * 100)}%</T>}
      </View>
      {!hit && <ProgressBar pct={pct} label={`${goalTitle(goal)} progress`} />}

      {recent.length > 0 && (
        <View style={styles.entries}>
          {recent.map((e) => (
            <EntryRow
              key={e.id}
              value={e.value}
              unit={goal.unit}
              day={e.logged_on}
              busy={busy}
              onDelete={() => run(async () => { await deleteGoalEntry(e.id); onChanged(); }, 'Couldn’t delete. Try again.')}
            />
          ))}
        </View>
      )}

      {logging ? (
        <View style={styles.logRow}>
          <View style={styles.flex}>
            <TextField
              label={goal.kind === 'bodyweight' ? 'Today’s weigh-in' : goal.kind === 'climb' ? 'Top grade today' : 'New best'}
              value={text}
              onChangeText={setText}
              keyboardType="decimal-pad"
              placeholder={goal.unit === 'v' ? 'e.g. 5' : `in ${goal.unit}`}
              autoFocus
              error={valueError(text, goal.unit)}
              onSubmitEditing={() => value != null && log()}
            />
          </View>
          <View style={styles.logButtons}>
            <Button label="Save" variant="dark" size="m" onPress={log} loading={busy} disabled={value == null} />
            <Press
              onPress={() => {
                setLogging(false);
                setText('');
              }}
              hitSlop={10}
              haptic={false}
              accessibilityRole="button"
              accessibilityLabel="Cancel">
              <X size={18} color={color.muted} weight="bold" />
            </Press>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          {hit ? <View /> : <Button label="Log progress" variant="outline" size="s" icon={Plus} onPress={() => setLogging(true)} />}
          <Press
            onPress={() => (confirmDelete ? run(async () => { await deleteGoal(goal.id); onChanged(); }, 'Couldn’t delete. Try again.') : setConfirmDelete(true))}
            disabled={busy}
            hitSlop={10}
            haptic={false}
            accessibilityRole="button"
            style={styles.deleteGoal}>
            <T v="footnote" c={confirmDelete ? 'danger' : 'muted'} style={styles.bold}>
              {confirmDelete ? 'Tap again to delete goal' : 'Delete goal'}
            </T>
          </Press>
        </View>
      )}
      {error && (
        <T v="footnote" c="danger">
          {error}
        </T>
      )}
    </View>
  );
}

function NewGoal({ userId, onDone, onCancel }: { userId: string; onDone: () => void; onCancel?: () => void }) {
  const [kind, setKind] = useState<GoalKind>('lift');
  const [lift, setLift] = useState<Lift>('deadlift');
  const [unit, setUnit] = useState<WeightUnit>('lb');
  const [start, setStart] = useState('');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const u = kind === 'climb' ? 'v' : unit;
  const s = parseValue(start, u);
  const t = parseValue(target, u);
  const problem =
    s == null || t == null
      ? null
      : s === t
        ? 'Pick a target different from where you are now.'
        : kind !== 'bodyweight' && t < s
          ? 'For lifts and grades, aim higher than where you are now.'
          : null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await createGoal(userId, { kind, lift: kind === 'lift' ? lift : null, unit: u, start_value: s!, target_value: t! });
      setStart('');
      setTarget('');
      onDone();
    } catch (e) {
      setError(
        (e as Error).message.includes('goals_one_open_idx')
          ? 'You already have an open goal for this. Hit it or delete it first.'
          : 'Couldn’t save the goal. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, shadow.card]}>
      <T v="title3">New goal</T>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Goal type">
        {GOAL_KINDS.map((k) => (
          <Chip key={k.kind} label={k.label} icon={k.icon} role="radio" selected={kind === k.kind} onPress={() => setKind(k.kind)} />
        ))}
      </View>
      {kind === 'lift' && (
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Lift">
          {LIFTS.map((l) => (
            <Chip key={l.lift} label={l.label} role="radio" selected={lift === l.lift} onPress={() => setLift(l.lift)} />
          ))}
        </View>
      )}
      {kind !== 'climb' && (
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Unit">
          {(['lb', 'kg'] as const).map((x) => (
            <Chip key={x} label={x} role="radio" selected={unit === x} onPress={() => setUnit(x)} />
          ))}
        </View>
      )}
      <View style={styles.pair}>
        <View style={styles.flex}>
          <TextField
            label={kind === 'climb' ? 'Top grade now' : kind === 'bodyweight' ? 'Weight now' : 'Best now'}
            value={start}
            onChangeText={setStart}
            keyboardType="decimal-pad"
            placeholder={u === 'v' ? 'V3' : u}
            error={valueError(start, u)}
          />
        </View>
        <View style={styles.flex}>
          <TextField label="Target" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder={u === 'v' ? 'V6' : u} error={valueError(target, u)} />
        </View>
      </View>
      {(problem || error) && (
        <T v="footnote" c="danger">
          {problem ?? error}
        </T>
      )}
      <View style={styles.actions}>
        {onCancel && <Button label="Cancel" variant="ghost" size="s" onPress={onCancel} />}
        <Button label="Set goal" variant="dark" size="m" onPress={save} loading={busy} disabled={s == null || t == null || !!problem} style={styles.flex} />
      </View>
    </View>
  );
}

// All goals: progress toward each, log entries, and the "Goal hit" moment.
export default function Goals() {
  const { ready, session } = useAuth();
  const userId = session?.user.id ?? null;
  const params = useLocalSearchParams<{ hit?: string }>();
  // failed: the latest load errored. Keep showing what we had; with nothing, show an error (never "no goals").
  const [loaded, setLoaded] = useState<{ userId: string; goals: Goal[] | null; failed: boolean } | null>(null);
  const [version, setVersion] = useState(0);
  const [adding, setAdding] = useState(false);
  const [hitId, setHitId] = useState<string | null>(params.hit ?? null);

  useEffect(() => {
    if (!userId) return;
    getGoals()
      .then((goals) => setLoaded({ userId, goals, failed: false }))
      .catch(() => setLoaded((prev) => ({ userId, goals: prev?.userId === userId ? prev.goals : null, failed: true })));
  }, [userId, version]);

  if (ready && !session) return <Redirect href={{ pathname: '/login', params: { next: '/goals' } }} />;
  const current = loaded?.userId === userId ? loaded : null;
  const goals = current?.goals ?? null;
  const open = goals?.filter((g) => !g.achieved_at) ?? [];
  const hit = goals?.filter((g) => g.achieved_at) ?? [];
  const hitGoal = hitId ? goals?.find((g) => g.id === hitId && g.achieved_at) : null;
  const reload = () => setVersion((v) => v + 1);

  function onHit(id: string) {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const g = goals?.find((x) => x.id === id);
    if (g) AccessibilityInfo.announceForAccessibility(`Goal hit: ${goalTitle(g)}`);
    setHitId(id);
  }

  function closeHit() {
    setHitId(null);
    if (params.hit) router.setParams({ hit: undefined }); // so a web reload doesn't bring it back
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title="Goals"
        width={layout.form}
        right={goals && goals.length > 0 && !adding ? <Button label="New" variant="outline" size="s" icon={Plus} onPress={() => setAdding(true)} /> : undefined}
      />
      {!current || !userId ? (
        <ActivityIndicator color={color.ink} style={{ marginTop: space.huge }} />
      ) : !goals ? (
        <EmptyState icon={Target} title="Couldn’t load your goals" body="Check your connection and try again." action="Try again" onAction={reload} />
      ) : (
        <ScrollScreen width={layout.form} gap={space.l}>
          {current.failed && (
            <T v="footnote" c="danger">
              Couldn’t refresh. What you see may be out of date.
            </T>
          )}
          {goals.length === 0 && !adding ? (
            <>
              <EmptyState
                icon={Target}
                title="Set your first goal"
                body="Deadlift 405, climb V6, or reach a bodyweight. Log progress and watch the bar move."
              />
              <NewGoal userId={userId} onDone={reload} />
            </>
          ) : (
            adding && (
              <NewGoal
                userId={userId}
                onDone={() => {
                  setAdding(false);
                  reload();
                }}
                onCancel={() => setAdding(false)}
              />
            )
          )}
          {open.map((g) => (
            <GoalCard key={g.id} goal={g} userId={userId} onChanged={reload} onHit={onHit} />
          ))}
          {hit.length > 0 && (
            <T v="title3" style={styles.sectionTitle}>
              Hit
            </T>
          )}
          {hit.map((g) => (
            <GoalCard key={g.id} goal={g} userId={userId} onChanged={reload} onHit={onHit} />
          ))}
        </ScrollScreen>
      )}
      {hitGoal && <HitBanner goal={hitGoal} onClose={closeHit} />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  flex: { flex: 1 },
  bold: { fontFamily: font.bold },
  card: { backgroundColor: color.card, borderRadius: radius.l, padding: space.l, gap: space.m },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  iconWrap: { width: 40, height: 40, borderRadius: radius.m, backgroundColor: color.sunken, alignItems: 'center', justifyContent: 'center' },
  entries: { gap: space.xs },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 36 },
  entryDelete: { minWidth: 44, minHeight: 32, alignItems: 'flex-end', justifyContent: 'center' },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.m },
  logButtons: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: 23 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m },
  deleteGoal: { paddingVertical: space.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  pair: { flexDirection: 'row', gap: space.m },
  hitWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: layout.gutter },
  hit: {
    width: '100%',
    maxWidth: layout.form - layout.gutter * 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.l,
    padding: space.xl,
    borderRadius: radius.xl,
    backgroundColor: color.ink,
  },
  sectionTitle: { marginTop: space.l },
});

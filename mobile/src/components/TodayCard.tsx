import { router } from 'expo-router';
import { Fire } from 'phosphor-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { Workout } from '@/lib/api';
import { streakLabel } from '@/lib/format';
import { useToday } from '@/lib/use-today';
import { kindOf } from '@/lib/workouts';
import { color, font, radius, shadow, space } from '@/theme/tokens';

import { Button } from './Button';
import { T } from './Text';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Mon-Sun: a filled circle for each logged day (rest days quieter), a dashed ring for today until it's logged.
function WeekStrip({ days, week, today }: { days: string[]; week: Workout[]; today: string }) {
  const states = days.map((day) => {
    const w = week.find((x) => x.logged_on === day);
    return { day, w, isToday: day === today, future: day > today };
  });
  const label = `This week: ${states
    .filter((s) => !s.future)
    .map((s, i) => `${DAYS[i]} ${s.w ? kindOf(s.w.kind).label.toLowerCase() : s.isToday ? 'not logged yet' : 'not logged'}`)
    .join(', ')}`;

  return (
    <View style={styles.week} accessible accessibilityRole="summary" accessibilityLabel={label}>
      {states.map(({ day, w, isToday, future }, i) => {
        const k = w ? kindOf(w.kind) : null;
        return (
          <View key={day} style={[styles.day, future && styles.future]}>
            <T v="footnote" c={isToday ? 'ink' : 'muted'} style={isToday && styles.bold}>
              {DAYS[i][0]}
            </T>
            <View style={[styles.dot, w ? (w.kind === 'rest' ? styles.dotRest : styles.dotOn) : isToday ? styles.dotToday : styles.dotOff]}>
              {k && <k.icon size={16} color={w!.kind === 'rest' ? color.ink2 : color.onDark} weight="bold" />}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const openLog = () => router.push('/log');

// The daily check-in: "Log today" until it's done, then what you did, the streak and (full) this week.
export function TodayCard({ compact }: { compact?: boolean }) {
  const { state, failed, retry } = useToday();

  if (!state) {
    return (
      <View style={[styles.card, shadow.card, !failed && styles.loading]}>
        {failed ? (
          <>
            <T v="callout" c="muted">
              Couldn’t load today. Check your connection.
            </T>
            <View style={styles.row}>
              <Button label="Try again" variant="outline" size="s" onPress={retry} />
              <Button label="Log today" size="s" onPress={openLog} />
            </View>
          </>
        ) : (
          <ActivityIndicator color={color.ink} />
        )}
      </View>
    );
  }

  const { logged, streak } = state;
  const k = logged ? kindOf(logged.kind) : null;
  return (
    <View style={[styles.card, shadow.card]}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <T v="overline" c="muted">
            Today
          </T>
          <T v="title3">{k ? `${k.past}${logged!.gyms ? ` at ${logged!.gyms.name}` : ''}` : 'Did you train today?'}</T>
          <View style={styles.streak}>
            <Fire size={16} color={streak ? color.ink : color.muted} weight={streak ? 'fill' : 'regular'} />
            <T v="callout" c={streak ? 'ink2' : 'muted'} style={styles.bold}>
              {streakLabel(streak)}
            </T>
          </View>
        </View>
        {logged && <Button label="Edit" variant="outline" size="s" onPress={openLog} />}
      </View>
      {logged?.note ? (
        <T v="callout" c="ink2">
          {logged.note}
        </T>
      ) : null}
      {!compact && <WeekStrip days={state.days} week={state.week} today={state.today} />}
      {!logged && <Button label="Log today" size="m" onPress={openLog} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  bold: { fontFamily: font.bold },
  card: { backgroundColor: color.card, borderRadius: radius.l, padding: space.l, gap: space.l },
  loading: { minHeight: 120, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: space.m },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.m },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 6, minWidth: 34 },
  future: { opacity: 0.45 },
  dot: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: color.ink },
  dotRest: { backgroundColor: color.sunken },
  dotToday: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.ink },
  dotOff: { borderWidth: 1.5, borderColor: color.line },
});

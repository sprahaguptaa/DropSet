import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';

import { getStreak, getWorkouts, type Workout } from './api';
import { localDate, weekDates } from './format';

export type TodayState = { today: string; days: string[]; week: Workout[]; streak: number; logged: Workout | null };

// Today's log, this week's logs and the streak. Reloads when the screen regains focus (so closing
// the log screen updates the card underneath) and when the app comes back on a new day.
export function useToday(): { state: TodayState | null; failed: boolean; retry: () => void } {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [loaded, setLoaded] = useState<{ userId: string; attempt: number; state: TodayState | null; failed: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let day = '';
      const load = () => {
        const today = localDate();
        const days = weekDates(today);
        day = today;
        Promise.all([getWorkouts(days[0], days[6]), getStreak(today)])
          .then(([week, streak]) =>
            setLoaded({ userId, attempt, failed: false, state: { today, days, week, streak, logged: week.find((w) => w.logged_on === today) ?? null } }),
          )
          .catch(() => setLoaded((prev) => ({ userId, attempt, failed: true, state: prev?.userId === userId ? prev.state : null })));
      };
      load();
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active' && localDate() !== day) load();
      });
      return () => sub.remove();
    }, [userId, attempt]),
  );

  const current = loaded?.userId === userId ? loaded : null;
  // After "Try again" the old failure is hidden (spinner) until this attempt finishes.
  return { state: current?.state ?? null, failed: !!current?.failed && current.attempt === attempt, retry: () => setAttempt((a) => a + 1) };
}

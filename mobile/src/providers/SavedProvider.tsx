import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { getSavedGymIds, setSaved } from '@/lib/api';

import { useAuth } from './AuthProvider';

type SavedState = { isSaved: (gymId: string) => boolean; toggle: (gymId: string) => void };

const SavedContext = createContext<SavedState | null>(null);
const NONE = new Set<string>();

// Keeps every heart in the app in sync. Logged-out taps go to log in.
export function SavedProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  // Tagged with its user so hearts reset instantly on log out / account switch.
  const [saved, setSavedIds] = useState<{ userId: string; ids: Set<string> } | null>(null);
  const ids = userId && saved?.userId === userId ? saved.ids : NONE;

  useEffect(() => {
    if (!userId) return;
    getSavedGymIds()
      .then((list) => setSavedIds({ userId, ids: new Set(list) }))
      .catch(() => {});
  }, [userId]);

  function toggle(gymId: string) {
    if (!userId) {
      router.push('/login');
      return;
    }
    const next = !ids.has(gymId);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const apply = (save: boolean) =>
      setSavedIds((prev) => {
        const copy = new Set(prev?.userId === userId ? prev.ids : []);
        if (save) copy.add(gymId);
        else copy.delete(gymId);
        return { userId, ids: copy };
      });
    apply(next); // optimistic
    setSaved(userId, gymId, next).catch(() => apply(!next));
  }

  return <SavedContext value={{ isSaved: (id) => ids.has(id), toggle }}>{children}</SavedContext>;
}

export function useSaved() {
  const ctx = use(SavedContext);
  if (!ctx) throw new Error('useSaved must be used inside <SavedProvider>');
  return ctx;
}

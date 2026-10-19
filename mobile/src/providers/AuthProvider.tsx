import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { getProfile } from '@/lib/api';
import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type Profile = Tables<'profiles'>;

type AuthState = {
  ready: boolean; // false until the stored session has been read
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  // Tagged with the user it belongs to, so a stale profile never shows after switching accounts.
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') router.replace('/reset-password');
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    getProfile(userId)
      .then((profile) => setLoaded({ userId, profile }))
      .catch(() => setLoaded({ userId, profile: null }));
  }, [userId]);

  const value: AuthState = {
    ready,
    session,
    profile: userId && loaded?.userId === userId ? loaded.profile : null,
    refreshProfile: async () => {
      if (userId) setLoaded({ userId, profile: await getProfile(userId) });
    },
    signOut: async () => {
      await supabase.auth.signOut();
      router.replace('/');
    },
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// First name for greetings: profile name, else the part of the email before @.
export function firstName(auth: AuthState) {
  const name = auth.profile?.display_name || auth.session?.user.email?.split('@')[0] || '';
  return name.split(/\s+/)[0];
}

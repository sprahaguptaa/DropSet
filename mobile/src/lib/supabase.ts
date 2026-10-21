import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';
import { kv } from './kv';

// The team's project. The publishable key is public by design (it ships inside every build);
// row-level security protects the data. Set these in .env.local only to point at a different project.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bcskupguftgwjcpkvnoo.supabase.co';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_tZeYrukTP7s-kqpU9wbnRw_av-qq_cL';

export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: kv,
    autoRefreshToken: true,
    persistSession: true,
    // Web reads the session from password-reset / OAuth links; native gets it from deep links (auth-links.ts).
    detectSessionInUrl: Platform.OS === 'web',
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

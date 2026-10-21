import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

// Where Supabase sends people back to after an email link or Google sign-in.
// Every URL this returns must be in Supabase > Authentication > URL Configuration > Redirect URLs.
export function authRedirect(path: '/reset-password' | '/explore') {
  if (Platform.OS === 'web') return `${window.location.origin}${path}`;
  return Linking.createURL(path); // exp://…/--/path in Expo Go, dropset://path in a build
}

// Native only: email and OAuth links carry the session in the URL (#access_token=…&refresh_token=…&type=recovery).
export async function sessionFromUrl(url: string) {
  const query = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] ?? '');
  const params = new URLSearchParams(query);
  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return { type: params.get('type') };
  }
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return { type: params.get('type') };
}

// An email link that failed (expired, already used, or opened by an inbox link-scanner first)
// comes back as #error=…&error_code=…. Returns a short code for the log-in screen's notice, or null.
export function emailLinkError(url: string): LinkNotice | null {
  const query = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] ?? '');
  const params = new URLSearchParams(query);
  if (!params.get('error_code') && !params.get('error')) return null;
  return params.get('error_code') === 'otp_expired' ? 'link-expired' : 'link-failed';
}

export type LinkNotice = 'link-expired' | 'link-failed';
export const LINK_NOTICES: Record<LinkNotice, string> = {
  'link-expired': 'That email link has expired or was already used. Log in below, or use Forgot password to get a fresh link.',
  'link-failed': 'That email link didn’t work. Log in below, or use Forgot password to get a fresh link.',
};

export const googleEnabled = process.env.EXPO_PUBLIC_GOOGLE_AUTH === '1';

export async function signInWithGoogle() {
  const redirectTo = authRedirect('/explore');
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
    return;
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'success') await sessionFromUrl(result.url);
}

// Supabase error text -> something a person can act on.
export function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'That email and password don’t match an account.';
  if (m.includes('email not confirmed')) return 'Confirm your email first. Check your inbox for the link.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Try logging in.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many tries. Wait a minute and try again.';
  if (m.includes('password should be') || m.includes('weak password')) return 'Pick a stronger password: at least 8 characters with a number.';
  if (m.includes('provider is not enabled')) return 'Google sign-in isn’t switched on yet. Use email for now.';
  if (m.includes('network') || m.includes('fetch')) return 'Can’t reach DropSet. Check your connection.';
  return message;
}

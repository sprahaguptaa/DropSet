import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { DefaultTheme, router, Stack, ThemeProvider, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import '@/theme/global.css';
import WebAnalytics from '@/components/WebAnalytics';
import { emailLinkError, sessionFromUrl } from '@/lib/auth-links';
import { AuthProvider } from '@/providers/AuthProvider';
import { SavedProvider } from '@/providers/SavedProvider';
import { color } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: color.canvas, primary: color.ember, text: color.ink, card: color.card, border: color.line },
};

// Email and Google links come back carrying either a session or an error (expired / already used link).
// Native gets them as deep links; web reads them from the page URL once the navigator is ready.
function AuthDeepLinks() {
  const url = Linking.useLinkingURL();
  const navReady = !!useRootNavigationState()?.key;

  useEffect(() => {
    if (Platform.OS === 'web' || !url || !navReady) return;
    const notice = emailLinkError(url);
    if (notice) {
      router.replace({ pathname: '/login', params: { notice } });
      return;
    }
    if (!/access_token|code=/.test(url)) return;
    sessionFromUrl(url)
      .then((r) => r?.type === 'recovery' && router.replace('/reset-password'))
      .catch(() => {});
  }, [url, navReady]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !navReady) return;
    const notice = emailLinkError(window.location.href);
    if (!notice) return;
    window.history.replaceState(null, '', window.location.pathname); // drop the #error=… from the address bar
    router.replace({ pathname: '/login', params: { notice } });
  }, [navReady]);

  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider value={theme}>
      <AuthProvider>
        <SavedProvider>
          <AuthDeepLinks />
          <WebAnalytics />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.canvas } }}>
            <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: color.ink }, animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="search" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="dark" />
        </SavedProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

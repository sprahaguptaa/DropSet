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
import { DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import '@/theme/global.css';
import { sessionFromUrl } from '@/lib/auth-links';
import { AuthProvider } from '@/providers/AuthProvider';
import { SavedProvider } from '@/providers/SavedProvider';
import { color } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: color.canvas, primary: color.ember, text: color.ink, card: color.card, border: color.line },
};

// Native: password-reset and Google links come back as deep links carrying the session.
function AuthDeepLinks() {
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (Platform.OS === 'web' || !url || !/access_token|code=/.test(url)) return;
    sessionFromUrl(url)
      .then((r) => r?.type === 'recovery' && router.replace('/reset-password'))
      .catch(() => {});
  }, [url]);
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

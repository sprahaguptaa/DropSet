import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GoogleLogo } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useWide } from '@/components/layout';
import { Logo } from '@/components/Logo';
import { PhotoMarquee } from '@/components/PhotoMarquee';
import { Press } from '@/components/Press';
import { T } from '@/components/Text';
import { friendlyAuthError, googleEnabled, signInWithGoogle } from '@/lib/auth-links';
import { useAuth } from '@/providers/AuthProvider';
import { color, font, motion, radius, shadow, space } from '@/theme/tokens';

function AuthChoices() {
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={styles.choices}>
      <View style={styles.choicesText}>
        <T v="title2">Your next session is a tap away</T>
        <T v="body" c="muted">
          Find a gym that fits how you train, see the real price, and buy a day, week or month pass. No membership.
        </T>
      </View>
      <View style={styles.buttons}>
        <Button label="Create account" onPress={() => router.push('/signup')} />
        <Button label="Log in" variant="outline" onPress={() => router.push('/login')} />
        {googleEnabled && (
          <Button
            label="Continue with Google"
            variant="outline"
            icon={GoogleLogo}
            onPress={() => signInWithGoogle().catch((e: Error) => setError(friendlyAuthError(e.message)))}
          />
        )}
        {error && (
          <T v="footnote" c="danger" style={styles.center}>
            {error}
          </T>
        )}
      </View>
      <Press onPress={() => router.replace('/explore')} haptic={false} accessibilityRole="link" style={styles.guest}>
        <T v="callout" c="cobalt" style={{ fontFamily: font.bold }}>
          Browse gyms first
        </T>
      </Press>
    </View>
  );
}

export default function Welcome() {
  const { ready, session } = useAuth();
  const wide = useWide();
  const insets = useSafeAreaInsets();

  const hero = useSharedValue(0);
  const sheet = useSharedValue(1);
  useEffect(() => {
    hero.set(withDelay(150, withTiming(1, { duration: 700 })));
    sheet.set(withDelay(650, withSpring(0, motion.sheet)));
  }, [hero, sheet]);

  const heroIn = useAnimatedStyle(() => ({ opacity: hero.get(), transform: [{ translateY: (1 - hero.get()) * 16 }] }));
  const sheetIn = useAnimatedStyle(() => ({ opacity: 1 - sheet.get() * 0.6, transform: [{ translateY: sheet.get() * 420 }] }));

  if (ready && session) return <Redirect href="/explore" />;

  const heroText = (
    <Animated.View style={[styles.hero, heroIn]}>
      <T v="overline" c="onDarkMuted">
        Phoenix · Tempe · Scottsdale
      </T>
      <T v="hero" c="onDark" style={wide && styles.heroWide}>
        {'Drop in.\nTrain anywhere.'}
      </T>
      {wide && (
        <T v="body" c="onDarkMuted" style={styles.heroSub}>
          Day, week and month passes at gyms built for how you train. No contract, no sign-up fee.
        </T>
      )}
    </Animated.View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <PhotoMarquee />
      <LinearGradient
        colors={['rgba(11,16,32,0.10)', 'rgba(11,16,32,0.55)', color.ink]}
        locations={wide ? [0, 0.4, 1] : [0, 0.38, 0.72]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.logo, { paddingTop: insets.top + space.l }]}>
        <Logo light size={wide ? 32 : 28} />
      </View>

      {wide ? (
        <View style={styles.wideRow}>
          {heroText}
          <Animated.View style={[styles.card, shadow.float, sheetIn]}>
            <AuthChoices />
          </Animated.View>
        </View>
      ) : (
        <View style={styles.stack}>
          {heroText}
          <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + space.l }, sheetIn]}>
            <View style={styles.handle} />
            <AuthChoices />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink, overflow: 'hidden' },
  logo: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: space.xxl },
  stack: { flex: 1, justifyContent: 'flex-end' },
  hero: { paddingHorizontal: space.xxl, paddingBottom: space.xxl, gap: space.m },
  heroWide: { fontSize: 76, lineHeight: 74, letterSpacing: -3 },
  heroSub: { maxWidth: 440, fontSize: 17, lineHeight: 25 },
  sheet: {
    backgroundColor: color.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: space.xxl,
    paddingTop: space.m,
  },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: color.line, marginBottom: space.l },
  wideRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: space.huge,
    gap: space.huge,
  },
  card: { width: 420, backgroundColor: color.canvas, borderRadius: 28, padding: space.xxxl - 4 },
  choices: { gap: space.xl },
  choicesText: { gap: space.s },
  buttons: { gap: space.m },
  guest: { alignSelf: 'center', paddingVertical: space.s, borderRadius: radius.s },
  center: { textAlign: 'center' },
});

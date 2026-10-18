import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { SPLASH_ROWS, unsplash } from '@/lib/photos';
import { color, radius } from '@/theme/tokens';

const W = 168;
const H = 224;
const GAP = 12;
const SPEEDS = [46000, 58000, 52000]; // ms per loop; rows drift at different paces

function Row({ ids, duration, reverse, still }: { ids: string[]; duration: number; reverse: boolean; still: boolean }) {
  const loop = ids.length * (W + GAP);
  const x = useSharedValue(reverse ? -loop : 0);

  useEffect(() => {
    if (still) return;
    x.set(withRepeat(withTiming(reverse ? 0 : -loop, { duration, easing: Easing.linear }), -1, false));
  }, [x, loop, duration, reverse, still]);

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <Animated.View style={[styles.row, slide]}>
      {[...ids, ...ids, ...ids].map((id, i) => (
        <Image key={`${id}-${i}`} source={unsplash(id, 420)} style={styles.photo} contentFit="cover" transition={400} />
      ))}
    </Animated.View>
  );
}

// Tilted wall of gym photos sliding sideways, rows alternating direction.
export function PhotoMarquee() {
  const still = useReducedMotion();
  return (
    <View style={styles.wall} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.tilt}>
        {SPLASH_ROWS.map((ids, i) => (
          <Row key={i} ids={ids} duration={SPEEDS[i]} reverse={i % 2 === 1} still={still} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wall: { ...StyleSheet.absoluteFill, overflow: 'hidden', backgroundColor: color.ink },
  tilt: { marginTop: -60, marginLeft: -120, gap: GAP, transform: [{ rotate: '-8deg' }, { scale: 1.12 }] },
  row: { flexDirection: 'row', gap: GAP },
  photo: { width: W, height: H, borderRadius: radius.l, backgroundColor: '#1A2033' },
});

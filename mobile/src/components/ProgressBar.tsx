import { StyleSheet, View } from 'react-native';

import { color, radius } from '@/theme/tokens';

// Goal progress, 0..1. Announced as a percentage; `label` says what it measures.
export function ProgressBar({ pct, label, height = 8 }: { pct: number; label: string; height?: number }) {
  const now = Math.round(Math.min(1, Math.max(0, pct)) * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now }}
      style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${now}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radius.pill, backgroundColor: color.sunken, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: color.ink },
});

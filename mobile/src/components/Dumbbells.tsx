import { StyleSheet, View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';

import { color } from '@/theme/tokens';

import { Press } from './Press';

// DropSet's rating unit: a dumbbell instead of a star.
export function Dumbbell({ size = 16, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G fill={color.ink} fillOpacity={filled ? 1 : 0.16}>
        <Rect x="6" y="10.25" width="12" height="3.5" rx="1" />
        <Rect x="3.75" y="4.5" width="4" height="15" rx="1.5" />
        <Rect x="16.25" y="4.5" width="4" height="15" rx="1.5" />
        <Rect x="0.75" y="8" width="3.5" height="8" rx="1.2" />
        <Rect x="19.75" y="8" width="3.5" height="8" rx="1.2" />
      </G>
    </Svg>
  );
}

// Read-only 1-5 rating (rounded to the nearest whole dumbbell).
export function DumbbellRating({ value, size = 16 }: { value: number | null; size?: number }) {
  const filled = value == null ? 0 : Math.round(value);
  return (
    <View
      style={[styles.row, { gap: Math.round(size * 0.3) }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={value == null ? 'No rating yet' : `${value.toFixed(1)} out of 5 dumbbells`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Dumbbell key={i} size={size} filled={i <= filled} />
      ))}
    </View>
  );
}

// Tap a dumbbell to rate 1-5.
export function DumbbellPicker({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <Press
          key={i}
          onPress={() => onChange(i)}
          scaleTo={0.85}
          hitSlop={4}
          accessibilityRole="radio"
          accessibilityLabel={`${i} dumbbell${i > 1 ? 's' : ''}`}
          accessibilityState={{ checked: value === i }}
          style={styles.pick}>
          <Dumbbell size={30} filled={i <= value} />
        </Press>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pick: { padding: 4 },
});

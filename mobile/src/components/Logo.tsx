import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { color } from '@/theme/tokens';

import { T } from './Text';

// The mark: three plates stepping down, a drop set. Ember tile, chalk bars.
export function Mark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityLabel="DropSet">
      <Rect width="32" height="32" rx="9" fill={color.ember} />
      <Rect x="7" y="8.5" width="18" height="4" rx="2" fill={color.canvas} />
      <Rect x="7" y="14" width="13" height="4" rx="2" fill={color.canvas} />
      <Rect x="7" y="19.5" width="8" height="4" rx="2" fill={color.canvas} />
    </Svg>
  );
}

export function Logo({ size = 30, light }: { size?: number; light?: boolean }) {
  return (
    <View style={styles.row}>
      <Mark size={size} />
      <T v="title2" c={light ? 'onDark' : 'ink'} style={{ fontSize: size * 0.82, lineHeight: size }}>
        DropSet
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

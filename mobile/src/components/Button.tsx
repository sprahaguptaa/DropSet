import type { Icon } from 'phosphor-react-native';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, radius, space } from '@/theme/tokens';

import { Press } from './Press';
import { T } from './Text';

type Variant = 'primary' | 'dark' | 'light' | 'outline' | 'ghost';

const look: Record<Variant, { bg: string; fg: keyof typeof color; border?: string }> = {
  primary: { bg: color.ember, fg: 'card' },
  dark: { bg: color.ink, fg: 'onDark' },
  light: { bg: color.card, fg: 'ink' },
  outline: { bg: 'transparent', fg: 'ink', border: color.line },
  ghost: { bg: 'transparent', fg: 'cobalt' },
};

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'l' | 'm' | 's';
  icon?: Icon;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', size = 'l', icon: IconCmp, loading, disabled, style }: Props) {
  const { bg, fg, border } = look[variant];
  const height = size === 'l' ? 56 : size === 'm' ? 48 : 38;
  const off = disabled || loading;
  return (
    <Press
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={[
        styles.base,
        { height, backgroundColor: bg, paddingHorizontal: size === 's' ? space.m : space.xl },
        border && { borderWidth: 1.5, borderColor: border },
        disabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={color[fg]} />
      ) : (
        <View style={styles.row}>
          {IconCmp && <IconCmp size={size === 's' ? 16 : 20} color={color[fg]} weight="bold" />}
          <T v={size === 's' ? 'footnote' : 'button'} c={fg} style={size === 's' && styles.smallLabel}>
            {label}
          </T>
        </View>
      )}
    </Press>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.m, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  disabled: { opacity: 0.4 },
  smallLabel: { fontFamily: 'PlusJakartaSans_700Bold' },
});

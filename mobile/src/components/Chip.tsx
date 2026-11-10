import type { Icon } from 'phosphor-react-native';
import { StyleSheet } from 'react-native';

import { color, font, radius, space } from '@/theme/tokens';

import { Press } from './Press';
import { T } from './Text';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: Icon;
  disabled?: boolean;
  role?: 'checkbox' | 'radio'; // radio when it's one of a single-choice group
};

// Selectable filter pill. Selected = cobalt (cobalt only ever means "selected" or "link").
export function Chip({ label, selected, onPress, icon: IconCmp, disabled, role = 'checkbox' }: Props) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.95}
      accessibilityRole={role}
      accessibilityState={{ checked: !!selected, disabled: !!disabled }}
      style={[styles.chip, selected && styles.on, disabled && styles.disabled]}>
      {IconCmp && <IconCmp size={16} color={selected ? color.cobalt : color.ink2} weight={selected ? 'fill' : 'regular'} />}
      <T v="callout" c={selected ? 'cobalt' : 'ink2'} style={styles.label} numberOfLines={1}>
        {label}
      </T>
    </Press>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 38,
    maxWidth: '100%',
    paddingHorizontal: space.m + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.line,
    backgroundColor: color.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  on: { backgroundColor: color.cobaltTint, borderColor: color.cobalt },
  disabled: { opacity: 0.5 },
  label: { fontFamily: font.semibold, flexShrink: 1 },
});

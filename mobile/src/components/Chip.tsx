import type { Icon } from 'phosphor-react-native';
import { StyleSheet } from 'react-native';

import { color, font, radius, space } from '@/theme/tokens';

import { Press } from './Press';
import { T } from './Text';

type Props = { label: string; selected?: boolean; onPress?: () => void; icon?: Icon };

// Selectable filter pill. Selected = cobalt (cobalt only ever means "selected" or "link").
export function Chip({ label, selected, onPress, icon: IconCmp }: Props) {
  return (
    <Press
      onPress={onPress}
      scaleTo={0.95}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!selected }}
      style={[styles.chip, selected && styles.on]}>
      {IconCmp && <IconCmp size={16} color={selected ? color.cobalt : color.ink2} weight={selected ? 'fill' : 'regular'} />}
      <T v="callout" c={selected ? 'cobalt' : 'ink2'} style={styles.label}>
        {label}
      </T>
    </Press>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 38,
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
  label: { fontFamily: font.semibold },
});

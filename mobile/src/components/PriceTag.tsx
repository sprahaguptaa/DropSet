import { StyleSheet, View } from 'react-native';

import type { PassType } from '@/lib/api';
import { money } from '@/lib/format';

import { T } from './Text';

type Props = { cents: number | null; unit: PassType | null; from?: boolean; align?: 'left' | 'right' };

export function PriceTag({ cents, unit, from = true, align = 'right' }: Props) {
  const alignItems = align === 'right' ? 'flex-end' : 'flex-start';
  if (cents == null) {
    return (
      <View style={{ alignItems }}>
        <T v="footnote" c="muted">
          Price not listed
        </T>
      </View>
    );
  }
  return (
    <View style={{ alignItems }}>
      {from && (
        <T v="overline" c="muted">
          From
        </T>
      )}
      <View style={styles.row}>
        <T v="price" c="ember">
          {money(cents)}
        </T>
        {unit && (
          <T v="footnote" c="muted">
            /{unit}
          </T>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
});

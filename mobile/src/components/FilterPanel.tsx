import { StyleSheet, View } from 'react-native';

import { money } from '@/lib/format';
import { STYLES } from '@/lib/styles';
import { space } from '@/theme/tokens';

import { Chip } from './Chip';
import { T } from './Text';

export type Filters = { styles: string[]; maxPriceCents: number | null; pricedOnly: boolean };

export const NO_FILTERS: Filters = { styles: [], maxPriceCents: null, pricedOnly: false };

const PRICE_STEPS = [null, 1500, 2500, 5000] as const;

// Training style + price filters. Used by the search sheet and the results page side rail on web.
export function FilterPanel({ value, onChange }: { value: Filters; onChange: (next: Filters) => void }) {
  const toggleStyle = (slug: string) =>
    onChange({
      ...value,
      styles: value.styles.includes(slug) ? value.styles.filter((s) => s !== slug) : [...value.styles, slug],
    });

  return (
    <View style={styles.wrap}>
      <View style={styles.group}>
        <T v="overline" c="muted">
          How you train
        </T>
        <View style={styles.chips}>
          {STYLES.map((s) => (
            <Chip key={s.slug} label={s.short} icon={s.icon} selected={value.styles.includes(s.slug)} onPress={() => toggleStyle(s.slug)} />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <T v="overline" c="muted">
          Day pass price
        </T>
        <View style={styles.chips}>
          {PRICE_STEPS.map((cents) => (
            <Chip
              key={cents ?? 'any'}
              label={cents == null ? 'Any price' : `Up to ${money(cents)}`}
              selected={value.maxPriceCents === cents}
              onPress={() => onChange({ ...value, maxPriceCents: cents })}
            />
          ))}
        </View>
        <View style={styles.chips}>
          <Chip
            label="Only gyms with a listed price"
            selected={value.pricedOnly || value.maxPriceCents != null}
            onPress={() => onChange({ ...value, pricedOnly: !value.pricedOnly, maxPriceCents: value.pricedOnly ? null : value.maxPriceCents })}
          />
        </View>
      </View>
    </View>
  );
}

// URL query <-> Filters, so results are linkable on web and survive back/forward.
export function filtersToParams(f: Filters) {
  return {
    styles: f.styles.join(',') || undefined,
    max: f.maxPriceCents != null ? String(f.maxPriceCents) : undefined,
    priced: f.pricedOnly ? '1' : undefined,
  };
}

export function filtersFromParams(p: { styles?: string; max?: string; priced?: string }): Filters {
  return {
    styles: p.styles ? p.styles.split(',').filter(Boolean) : [],
    maxPriceCents: p.max ? Number(p.max) : null,
    pricedOnly: p.priced === '1',
  };
}

const styles = StyleSheet.create({
  wrap: { gap: space.xxl },
  group: { gap: space.m },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
});

import { router, useLocalSearchParams } from 'expo-router';
import { MapPinLine, SlidersHorizontal, WarningCircle } from 'phosphor-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { FilterPanel, filtersFromParams, filtersToParams, type Filters } from '@/components/FilterPanel';
import { GymCard, GymCardSkeleton } from '@/components/GymCard';
import { EmptyState, IconButton, ScreenHeader, useWide } from '@/components/layout';
import { T } from '@/components/Text';
import { searchGyms, type GymResult } from '@/lib/api';
import { RADIUS_MILES } from '@/lib/format';
import { DEFAULT_PLACE } from '@/lib/places';
import { styleName } from '@/lib/styles';
import { color, font, layout, radius, shadow, space } from '@/theme/tokens';

type Params = { label?: string; lat?: string; lng?: string; styles?: string; max?: string; priced?: string };

export default function Results() {
  const params = useLocalSearchParams<Params>();
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const label = params.label ?? DEFAULT_PLACE.label;
  const lat = Number(params.lat ?? DEFAULT_PLACE.lat);
  const lng = Number(params.lng ?? DEFAULT_PLACE.lng);
  const { styles: styleParam, max, priced } = params;
  const filters = filtersFromParams(params);
  const queryKey = `${lat},${lng}|${styleParam}|${max}|${priced}`;

  // Results are tagged with the query that produced them; a new query shows skeletons until it lands.
  const [result, setResult] = useState<{ key: string; gyms?: GymResult[]; error?: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const current = result?.key === queryKey ? result : null;
  const gyms = current?.gyms ?? null;
  const error = current?.error ?? null;

  const load = useCallback(
    () =>
      searchGyms({ lat, lng, ...filtersFromParams({ styles: styleParam, max, priced }) })
        .then((rows) => setResult({ key: queryKey, gyms: rows }))
        .catch((e: Error) => setResult({ key: queryKey, error: e.message })),
    [lat, lng, styleParam, max, priced, queryKey],
  );

  useEffect(() => {
    searchGyms({ lat, lng, ...filtersFromParams({ styles: styleParam, max, priced }) })
      .then((rows) => setResult({ key: queryKey, gyms: rows }))
      .catch((e: Error) => setResult({ key: queryKey, error: e.message }));
  }, [lat, lng, styleParam, max, priced, queryKey]);

  const setFilters = (f: Filters) => router.setParams(filtersToParams(f));
  const openSearch = () =>
    router.push({ pathname: '/search', params: { label, lat: String(lat), lng: String(lng), ...filtersToParams(filters) } });

  const active = filters.styles.length + (filters.maxPriceCents != null || filters.pricedOnly ? 1 : 0);
  const summary = [
    filters.styles.length ? filters.styles.map(styleName).join(', ') : 'Any style',
    filters.maxPriceCents != null ? `up to $${filters.maxPriceCents / 100}` : filters.pricedOnly ? 'listed price' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const header = (
    <View style={styles.listHead}>
      <T v="callout" c="ink2" style={{ fontFamily: font.semibold }}>
        {gyms == null ? 'Finding gyms…' : `${gyms.length} ${gyms.length === 1 ? 'gym' : 'gyms'} · nearest first`}
      </T>
    </View>
  );

  let body: React.ReactNode;
  if (error) {
    body = <EmptyState icon={WarningCircle} title="Couldn’t load gyms" body={error} action="Try again" onAction={load} />;
  } else if (gyms == null) {
    body = (
      <View style={[styles.list, wide && styles.listWide]}>
        {header}
        {Array.from({ length: 5 }, (_, i) => (
          <GymCardSkeleton key={i} wide={wide} />
        ))}
      </View>
    );
  } else {
    body = (
      <FlatList
        data={gyms}
        keyExtractor={(g) => g.gym_id}
        renderItem={({ item }) => <GymCard gym={item} wide={wide} />}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: space.m }} />}
        contentContainerStyle={[styles.list, wide && styles.listWide, { paddingBottom: insets.bottom + space.huge }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={color.ink}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={MapPinLine}
            title={active ? 'No gyms match those filters' : 'No gyms within 30 miles'}
            body={
              active
                ? 'Try another training style or a higher price. Many gyms haven’t listed a day-pass price yet.'
                : 'DropSet is live around Phoenix, Tempe and Scottsdale for now.'
            }
            action={active ? 'Clear filters' : 'Explore Phoenix'}
            onAction={() =>
              active
                ? setFilters({ styles: [], maxPriceCents: null, pricedOnly: false })
                : router.setParams({ label: DEFAULT_PLACE.label, lat: String(DEFAULT_PLACE.lat), lng: String(DEFAULT_PLACE.lng) })
            }
          />
        }
        ListFooterComponent={
          gyms.length ? (
            <T v="footnote" c="muted" style={styles.credit}>
              Showing gyms within {RADIUS_MILES} mi. Gym locations © OpenStreetMap contributors.
            </T>
          ) : undefined
        }
      />
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={label}
        subtitle={`Within ${RADIUS_MILES} mi · ${summary}`}
        right={!wide && <IconButton icon={SlidersHorizontal} label={`Filters${active ? `, ${active} on` : ''}`} onPress={openSearch} />}
      />
      {wide ? (
        <View style={styles.wideRow}>
          <View style={[styles.rail, shadow.card]}>
            <View style={styles.railWhere}>
              <View style={styles.flex}>
                <T v="overline" c="muted">
                  Where
                </T>
                <T v="headline">{label}</T>
              </View>
              <Button label="Change" variant="outline" size="s" onPress={openSearch} />
            </View>
            <FilterPanel value={filters} onChange={setFilters} />
          </View>
          <View style={styles.flex}>{body}</View>
        </View>
      ) : (
        body
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  flex: { flex: 1 },
  list: { gap: space.m, paddingHorizontal: layout.gutter, width: '100%', maxWidth: 760, alignSelf: 'center' },
  listWide: { maxWidth: undefined, paddingHorizontal: 0 },
  listHead: { gap: 4, paddingBottom: space.s },
  credit: { textAlign: 'center', paddingVertical: space.xxl },
  wideRow: {
    flex: 1,
    flexDirection: 'row',
    gap: space.xxl,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.gutter,
  },
  rail: {
    width: 320,
    alignSelf: 'flex-start',
    backgroundColor: color.card,
    borderRadius: radius.l,
    padding: space.xl,
    gap: space.xxl,
  },
  railWhere: { flexDirection: 'row', alignItems: 'center', gap: space.m },
});

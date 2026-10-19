import { router, useLocalSearchParams } from 'expo-router';
import { AirplaneTilt, Check, GraduationCap, MagnifyingGlass, MapPin, NavigationArrow } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { FilterPanel, filtersFromParams, filtersToParams, NO_FILTERS, type Filters } from '@/components/FilterPanel';
import { Column, ScreenHeader, ScrollScreen } from '@/components/layout';
import { Press } from '@/components/Press';
import { T } from '@/components/Text';
import { currentPosition } from '@/lib/location';
import { findPlaces, type Place } from '@/lib/places';
import { color, font, radius, shadow, space } from '@/theme/tokens';

type Where = { label: string; lat: number; lng: number };

const KIND_ICON = { city: MapPin, airport: AirplaneTilt, campus: GraduationCap } as const;

export default function Search() {
  const params = useLocalSearchParams<{ label?: string; lat?: string; lng?: string; styles?: string; max?: string; priced?: string }>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [where, setWhere] = useState<Where | null>(
    params.lat && params.lng ? { label: params.label ?? 'Selected area', lat: Number(params.lat), lng: Number(params.lng) } : null,
  );
  const [filters, setFilters] = useState<Filters>(params.lat ? filtersFromParams(params) : NO_FILTERS);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const places = query.trim() ? findPlaces(query) : findPlaces('').slice(0, 5); // top picks until they type

  async function useMyLocation() {
    setLocError(null);
    setLocating(true);
    try {
      setWhere({ label: 'Near you', ...(await currentPosition()) });
      setQuery('');
    } catch (e) {
      setLocError((e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  function pick(p: Place) {
    setWhere({ label: p.label, lat: p.lat, lng: p.lng });
    setQuery('');
  }

  function show() {
    if (!where) return;
    router.dismissTo({
      pathname: '/results',
      params: { label: where.label, lat: String(where.lat), lng: String(where.lng), ...filtersToParams(filters) },
    });
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Search" close />
      <ScrollScreen contentContainerStyle={styles.content}>
        <View style={styles.block}>
          <T v="overline" c="muted">
            Where
          </T>
          <View style={[styles.input, shadow.card]}>
            <MagnifyingGlass size={20} color={color.ink} weight="bold" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={where ? where.label : 'City, airport or campus'}
              placeholderTextColor={where ? color.ink : color.muted}
              style={styles.inputText}
              autoFocus={!where && Platform.OS !== 'web'}
              returnKeyType="search"
              selectionColor={color.cobalt}
              onSubmitEditing={() => places[0] && pick(places[0])}
            />
          </View>

          <View style={[styles.list, shadow.card]}>
            <Press onPress={useMyLocation} haptic={false} scaleTo={0.99} style={styles.place}>
              <View style={[styles.placeIcon, { backgroundColor: color.cobaltTint }]}>
                {locating ? <ActivityIndicator size="small" color={color.cobalt} /> : <NavigationArrow size={18} color={color.cobalt} weight="fill" />}
              </View>
              <View style={styles.flex}>
                <T v="bodyStrong" c="cobalt">
                  Use my current location
                </T>
                {locError ? (
                  <T v="footnote" c="danger">
                    {locError}
                  </T>
                ) : (
                  <T v="footnote" c="muted">
                    Gyms within 30 miles of you
                  </T>
                )}
              </View>
              {where?.label === 'Near you' && <Check size={20} color={color.cobalt} weight="bold" />}
            </Press>
            {places.map((p) => {
              const Icon = KIND_ICON[p.kind];
              const selected = where?.label === p.label;
              return (
                <Press key={p.id} onPress={() => pick(p)} haptic={false} scaleTo={0.99} style={[styles.place, styles.divider]}>
                  <View style={styles.placeIcon}>
                    <Icon size={18} color={color.ink} />
                  </View>
                  <View style={styles.flex}>
                    <T v="bodyStrong">{p.label}</T>
                    <T v="footnote" c="muted">
                      {p.detail}
                    </T>
                  </View>
                  {selected && <Check size={20} color={color.cobalt} weight="bold" />}
                </Press>
              );
            })}
            {places.length === 0 && (
              <View style={[styles.place, styles.divider]}>
                <T v="callout" c="muted">
                  DropSet covers the Phoenix area for now. Try Phoenix, Tempe or Scottsdale.
                </T>
              </View>
            )}
          </View>
        </View>

        <FilterPanel value={filters} onChange={setFilters} />
      </ScrollScreen>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.m }]}>
        <Column style={styles.barRow}>
          <Press onPress={() => setFilters(NO_FILTERS)} haptic={false} accessibilityRole="button">
            <T v="callout" style={{ fontFamily: font.bold, textDecorationLine: 'underline' }}>
              Clear filters
            </T>
          </Press>
          <Button label={where ? 'Show gyms' : 'Pick a place'} onPress={show} disabled={!where} style={styles.cta} />
        </Column>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  flex: { flex: 1 },
  content: { gap: space.xxxl, paddingTop: space.s },
  block: { gap: space.m },
  input: {
    height: 56,
    borderRadius: radius.m,
    backgroundColor: color.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.l,
  },
  inputText: { flex: 1, height: '100%', fontFamily: font.semibold, fontSize: 16, color: color.ink },
  list: { borderRadius: radius.l, backgroundColor: color.card, overflow: 'hidden' },
  place: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.l, paddingVertical: space.m },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  placeIcon: { width: 36, height: 36, borderRadius: radius.s, backgroundColor: color.sunken, alignItems: 'center', justifyContent: 'center' },
  bar: { backgroundColor: color.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line, paddingTop: space.m },
  barRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.l },
  cta: { minWidth: 180 },
});

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { MagnifyingGlass, NavigationArrow } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Press } from '@/components/Press';
import { PriceTag } from '@/components/PriceTag';
import { ScrollScreen, Section, useWide } from '@/components/layout';
import { T } from '@/components/Text';
import { searchGyms, type GymResult } from '@/lib/api';
import { greeting, miles } from '@/lib/format';
import { currentPosition } from '@/lib/location';
import { gymPhoto } from '@/lib/photos';
import { DEFAULT_PLACE, PLACES, type Place } from '@/lib/places';
import { STYLES, stylePhoto } from '@/lib/styles';
import { firstName, useAuth } from '@/providers/AuthProvider';
import { color, font, radius, shadow, space } from '@/theme/tokens';

const QUICK = ['phoenix', 'tempe', 'scottsdale', 'phx', 'asu'].map((id) => PLACES.find((p) => p.id === id)!);

function openResults(place: Pick<Place, 'label' | 'lat' | 'lng'>, extra: Record<string, string> = {}) {
  router.push({ pathname: '/results', params: { label: place.label, lat: String(place.lat), lng: String(place.lng), ...extra } });
}

function Rail({ wide, children }: { wide: boolean; children: React.ReactNode }) {
  if (wide) return <View style={styles.grid}>{children}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} style={styles.railBleed}>
      {children}
    </ScrollView>
  );
}

export default function Explore() {
  const auth = useAuth();
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const [nearby, setNearby] = useState<GymResult[] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const name = firstName(auth);

  useEffect(() => {
    searchGyms({ lat: DEFAULT_PLACE.lat, lng: DEFAULT_PLACE.lng, pricedOnly: true })
      .then((r) => setNearby(r.slice(0, 8)))
      .catch(() => setNearby([]));
  }, []);

  async function nearMe() {
    setLocError(null);
    setLocating(true);
    try {
      const pos = await currentPosition();
      openResults({ label: 'Near you', ...pos });
    } catch (e) {
      setLocError((e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  return (
    <ScrollScreen contentContainerStyle={{ paddingTop: wide ? space.xxxl : insets.top + space.l }}>
      <View style={styles.greetRow}>
        <T v="callout" c="muted" style={{ fontFamily: font.semibold }}>
          {greeting()}
          {name ? `, ${name}` : ''}
        </T>
        {auth.session ? (
          <Press onPress={() => router.navigate('/profile')} accessibilityLabel="Profile">
            <Avatar url={auth.profile?.avatar_url} name={name} size={40} />
          </Press>
        ) : Platform.OS !== 'web' || !wide ? (
          <Press onPress={() => router.push('/login')} haptic={false} accessibilityRole="link">
            <T v="callout" c="cobalt" style={{ fontFamily: font.bold }}>
              Log in
            </T>
          </Press>
        ) : null}
      </View>

      <T v="title1" style={[styles.title, wide && styles.titleWide]}>
        {'Where are you\ntraining?'}
      </T>

      <View style={[styles.searchRow, wide && styles.searchRowWide]}>
        <Press onPress={() => router.push('/search')} scaleTo={0.98} style={[styles.search, shadow.card]} accessibilityRole="search">
          <MagnifyingGlass size={22} color={color.ink} weight="bold" />
          <View style={styles.searchText}>
            <T v="headline">Where to?</T>
            <T v="footnote" c="muted" numberOfLines={1}>
              City, airport or campus · 30 mi
            </T>
          </View>
        </Press>
        <Press onPress={nearMe} disabled={locating} scaleTo={0.92} style={[styles.nearMe, shadow.card]} accessibilityLabel="Gyms near me">
          {locating ? <ActivityIndicator color={color.cobalt} /> : <NavigationArrow size={22} color={color.cobalt} weight="fill" />}
        </Press>
      </View>
      {locError && (
        <T v="footnote" c="danger" style={styles.locError}>
          {locError}
        </T>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick} style={styles.railBleed}>
        {QUICK.map((p) => (
          <Press key={p.id} onPress={() => openResults(p)} scaleTo={0.95} style={styles.quickChip}>
            <T v="callout" c="ink2" style={{ fontFamily: font.semibold }}>
              {p.label}
            </T>
          </Press>
        ))}
      </ScrollView>

      <Section title="Train your way">
        <Rail wide={wide}>
          {STYLES.map((s) => (
            <Press
              key={s.slug}
              onPress={() => openResults(DEFAULT_PLACE, { styles: s.slug })}
              scaleTo={0.96}
              style={[styles.styleTile, wide && styles.styleTileWide]}
              accessibilityLabel={`${s.name} gyms`}>
              <Image source={stylePhoto(s.slug, 400)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
              <LinearGradient colors={['rgba(11,16,32,0)', 'rgba(11,16,32,0.85)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
              <View style={styles.styleLabel}>
                <s.icon size={18} color={color.onDark} weight="bold" />
                <T v="headline" c="onDark">
                  {s.short}
                </T>
              </View>
            </Press>
          ))}
        </Rail>
      </Section>

      <Section title="Day passes near Phoenix" action="See all" onAction={() => openResults(DEFAULT_PLACE, { priced: '1' })}>
        <Rail wide={wide}>
          {(nearby ?? Array.from({ length: 4 }, () => null)).map((g, i) =>
            g ? (
              <Press
                key={g.gym_id}
                onPress={() => router.push({ pathname: '/gym/[slug]', params: { slug: g.slug } })}
                scaleTo={0.97}
                style={[styles.mini, wide && styles.miniWide, shadow.card]}>
                <Image source={gymPhoto(g, 480)} style={styles.miniPhoto} contentFit="cover" transition={250} />
                <View style={styles.miniBody}>
                  <View style={styles.flex}>
                    <T v="headline" numberOfLines={1}>
                      {g.name}
                    </T>
                    <T v="footnote" c="muted" numberOfLines={1}>
                      {g.city} · {miles(g.distance_m)}
                    </T>
                  </View>
                  <PriceTag cents={g.min_price_cents} unit={g.min_price_pass_type} from={false} />
                </View>
              </Press>
            ) : (
              <View key={i} style={[styles.mini, wide && styles.miniWide, styles.miniSkeleton]} />
            ),
          )}
        </Rail>
      </Section>

      <View style={[styles.how, wide && styles.howWide]}>
        <T v="overline" c="onDarkMuted">
          How DropSet works
        </T>
        <View style={[styles.steps, wide && styles.stepsWide]}>
          {[
            ['Find', 'Search by city and how you train. Real prices up front.'],
            ['Buy', 'Day, week or month pass. No membership, no contract.'],
            ['Check in', 'Show your QR pass at the desk. The clock starts when you activate.'],
          ].map(([title, body], i) => (
            <View key={title} style={styles.step}>
              <T v="title2" c="onDark">
                {String(i + 1).padStart(2, '0')}
              </T>
              <View style={styles.flex}>
                <T v="headline" c="onDark">
                  {title}
                </T>
                <T v="callout" c="onDarkMuted">
                  {body}
                </T>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  greetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
  title: { marginTop: space.s, fontSize: 36, lineHeight: 38, letterSpacing: -1.2 },
  titleWide: { fontSize: 56, lineHeight: 56, letterSpacing: -2 },
  searchRow: { flexDirection: 'row', gap: space.m, marginTop: space.xl },
  searchRowWide: { maxWidth: 720 },
  search: {
    flex: 1,
    minHeight: 68,
    borderRadius: radius.l,
    backgroundColor: color.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m + 2,
    paddingHorizontal: space.l + 2,
  },
  searchText: { flex: 1, gap: 1 },
  nearMe: { width: 68, minHeight: 68, borderRadius: radius.l, backgroundColor: color.card, alignItems: 'center', justifyContent: 'center' },
  locError: { marginTop: space.s },
  railBleed: { marginHorizontal: -20 },
  quick: { gap: space.s, paddingHorizontal: 20, paddingTop: space.l },
  quickChip: {
    height: 36,
    paddingHorizontal: space.m + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.line,
    justifyContent: 'center',
  },
  rail: { gap: space.m, paddingHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.l },
  styleTile: { width: 136, height: 176, borderRadius: radius.l, overflow: 'hidden', backgroundColor: color.sunken },
  styleTileWide: { width: 196, height: 220 },
  styleLabel: { position: 'absolute', left: 12, right: 12, bottom: 12, gap: 6 },
  mini: { width: 248, borderRadius: radius.l, backgroundColor: color.card, overflow: 'hidden' },
  miniWide: { width: 252 },
  miniSkeleton: { height: 228, backgroundColor: color.sunken },
  miniPhoto: { width: '100%', height: 156, backgroundColor: color.sunken },
  miniBody: { flexDirection: 'row', alignItems: 'flex-end', gap: space.m, padding: space.m + 2 },
  how: { marginTop: space.xxxl + 8, backgroundColor: color.ink, borderRadius: radius.xl, padding: space.xxl, gap: space.l },
  howWide: { padding: space.huge - 8 },
  steps: { gap: space.xl },
  stepsWide: { flexDirection: 'row', gap: space.xxxl },
  step: { flex: 1, flexDirection: 'row', gap: space.l, alignItems: 'flex-start' },
});

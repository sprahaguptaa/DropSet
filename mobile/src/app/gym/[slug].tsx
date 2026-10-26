import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowSquareOut,
  CaretLeft,
  CheckCircle,
  Clock,
  Globe,
  Heart,
  Info,
  MapPin,
  Phone,
  SealCheck,
  WarningCircle,
} from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, PartnerBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { back, Column, EmptyState, IconButton, useWide } from '@/components/layout';
import { Press } from '@/components/Press';
import { RatingLine, ReviewsSection, useReviews } from '@/components/Reviews';
import { T } from '@/components/Text';
import { asHours, getGym, type GymDetail, type PassOption } from '@/lib/api';
import { hoursLines, money, passLength, shortDate } from '@/lib/format';
import { gymPhoto } from '@/lib/photos';
import { styleOf } from '@/lib/styles';
import { useAuth } from '@/providers/AuthProvider';
import { useSaved } from '@/providers/SavedProvider';
import { color, font, radius, shadow, space } from '@/theme/tokens';

function confidenceLine(o: PassOption) {
  if (o.price_confidence === 'official')
    return { icon: SealCheck, text: `Verified on the gym’s site${o.price_verified_at ? ` · ${shortDate(o.price_verified_at)}` : ''}` };
  if (o.price_confidence === 'third_party') return { icon: Info, text: 'From a third-party source · confirm at the desk' };
  return { icon: Info, text: 'Unverified price' };
}

function PassPicker({ options, selected, onSelect }: { options: PassOption[]; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <View style={styles.options}>
      {options.map((o) => {
        const on = o.id === selected;
        const line = confidenceLine(o);
        return (
          <Press
            key={o.id}
            onPress={() => onSelect(o.id)}
            scaleTo={0.99}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={[styles.option, on && styles.optionOn]}>
            <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
            <View style={styles.flex}>
              <T v="headline">{o.name}</T>
              <T v="footnote" c="muted">
                {passLength(o.duration_days)}
                {o.notes ? ` · ${o.notes}` : ''}
              </T>
              <View style={styles.confidence}>
                <line.icon size={12} color={color.muted} weight="bold" />
                <T v="footnote" c="muted" style={styles.confidenceText}>
                  {line.text}
                </T>
              </View>
            </View>
            <T v="price" c="ember">
              {money(o.price_cents)}
            </T>
          </Press>
        );
      })}
    </View>
  );
}

function Fact({ icon: IconCmp, children, onPress }: { icon: typeof Clock; children: React.ReactNode; onPress?: () => void }) {
  const content = (
    <View style={styles.fact}>
      <IconCmp size={20} color={color.ink} />
      <View style={styles.flex}>{children}</View>
      {onPress && <ArrowSquareOut size={16} color={color.muted} />}
    </View>
  );
  return onPress ? (
    <Press onPress={onPress} haptic={false} scaleTo={0.99} accessibilityRole="link">
      {content}
    </Press>
  ) : (
    content
  );
}

export default function GymScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { isSaved, toggle } = useSaved();
  // Tagged with its slug: navigating gym -> gym shows the spinner instead of the previous gym.
  const [loaded, setLoaded] = useState<{ slug: string; gym: GymDetail | null; error?: string } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  // Header bar fades in once the hero photo has scrolled away.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => scrollY.set(e.contentOffset.y));
  const heroHeight = wide ? 440 : 340;
  const headerIn = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [heroHeight - 150, heroHeight - 90], [0, 1], Extrapolation.CLAMP),
  }));
  const current = loaded?.slug === slug ? loaded : null;
  const gym = current ? current.gym : undefined;
  const error = current?.error ?? null;
  const { reviews, summary, userId, reload } = useReviews(gym?.id ?? null);

  useEffect(() => {
    getGym(slug)
      .then((g) => setLoaded({ slug, gym: g }))
      .catch((e: Error) => setLoaded({ slug, gym: null, error: e.message }));
  }, [slug]);

  if (error || gym === null) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + space.huge }]}>
        <EmptyState
          icon={WarningCircle}
          title={error ? 'Couldn’t load this gym' : 'Gym not found'}
          body={error ?? 'It may have been removed from DropSet.'}
          action="Back to search"
          onAction={() => back()}
        />
      </View>
    );
  }
  if (gym === undefined) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={color.ink} />
      </View>
    );
  }

  const option = gym.pass_options.find((o) => o.id === picked) ?? gym.pass_options[0] ?? null;
  const selected = option?.id ?? null;
  const setSelected = setPicked;
  const saved = isSaved(gym.id);
  const hours = hoursLines(asHours(gym.hours));
  const cover = gym.photos[0]?.url ?? gymPhoto({ slug: gym.slug, style_slugs: gym.styles.map((s) => s.slug) }, 1200);
  const address = [gym.address_line1, gym.city, gym.state].filter(Boolean).join(', ');
  const mapsUrl =
    gym.lat != null
      ? Platform.OS === 'ios'
        ? `https://maps.apple.com/?ll=${gym.lat},${gym.lng}&q=${encodeURIComponent(gym.name)}`
        : `https://www.google.com/maps/search/?api=1&query=${gym.lat},${gym.lng}`
      : null;
  const fromOsm = gym.data_source === 'openstreetmap';
  const hasDemoData = gym.hours_is_demo || gym.pass_options.some((o) => o.is_demo);

  function getPass() {
    if (!option) return;
    if (!session) {
      router.push({ pathname: '/login', params: { next: `/checkout/${option.id}` } });
      return;
    }
    router.push({ pathname: '/checkout/[optionId]', params: { optionId: option.id } });
  }

  const passCard = (
    <View style={[styles.passCard, wide && [styles.passCardWide, shadow.card]]}>
      <T v="title3">Passes</T>
      {gym.pass_options.length ? (
        <PassPicker options={gym.pass_options} selected={selected} onSelect={setSelected} />
      ) : (
        <View style={styles.noPrice}>
          <T v="bodyStrong">No day-pass price listed yet</T>
          <T v="callout" c="muted">
            We haven’t confirmed what this gym charges visitors. Call or check their site, and we’ll add it once verified.
          </T>
        </View>
      )}
      {wide && (
        <Button
          label={option ? `Get ${option.pass_type} pass · ${money(option.price_cents)}` : 'Not bookable yet'}
          onPress={getPass}
          disabled={!option}
        />
      )}
    </View>
  );

  const details = (
    <View style={styles.details}>
      <View style={styles.titleBlock}>
        <View style={styles.badges}>
          {gym.is_partner && <PartnerBadge />}
          {gym.styles.map((s) => {
            const st = styleOf(s.slug);
            return <Badge key={s.slug} label={st?.short ?? s.name} icon={st?.icon} />;
          })}
        </View>
        <T v="title1">{gym.name}</T>
        <RatingLine summary={summary} />
        <View style={styles.addressRow}>
          <MapPin size={16} color={color.muted} weight="fill" />
          <T v="callout" c="ink2" style={styles.flex}>
            {address}
          </T>
        </View>
        {mapsUrl && (
          <Press onPress={() => Linking.openURL(mapsUrl)} haptic={false} accessibilityRole="link" style={styles.mapsLink}>
            <T v="callout" c="cobalt" style={{ fontFamily: font.bold }}>
              Open in Maps
            </T>
          </Press>
        )}
      </View>

      {!wide && passCard}

      {gym.notes ? (
        <View style={styles.note}>
          <Info size={18} color={color.ink} weight="bold" />
          <T v="callout" c="ink2" style={styles.flex}>
            {gym.notes}
          </T>
        </View>
      ) : null}

      {gym.amenities.length > 0 && (
        <View style={styles.block}>
          <T v="title3">What’s inside</T>
          <View style={styles.amenities}>
            {gym.amenities.map((a) => (
              <View key={a.slug} style={styles.amenity}>
                <CheckCircle size={16} color={color.ink} weight="fill" />
                <T v="callout" c="ink2">
                  {a.name}
                </T>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.block}>
        <T v="title3">Good to know</T>
        <View style={[styles.facts, shadow.card]}>
          <Fact icon={Clock}>
            {hours.length ? (
              hours.map((h) => (
                <T key={h} v="callout" c="ink2">
                  {h}
                </T>
              ))
            ) : (
              <T v="callout" c="muted">
                Hours not listed. Check with the gym.
              </T>
            )}
          </Fact>
          {gym.phone && (
            <Fact icon={Phone} onPress={() => Linking.openURL(`tel:${gym.phone}`)}>
              <T v="callout" c="ink2">
                {gym.phone}
              </T>
            </Fact>
          )}
          {gym.website_url && (
            <Fact icon={Globe} onPress={() => Linking.openURL(gym.website_url!)}>
              <T v="callout" c="ink2" numberOfLines={1}>
                {gym.website_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </T>
            </Fact>
          )}
        </View>
      </View>

      <ReviewsSection
        gymId={gym.id}
        slug={gym.slug}
        googleQuery={`${gym.name} ${address}`}
        reviews={reviews}
        userId={userId}
        reload={reload}
      />

      <T v="footnote" c="muted" style={styles.source}>
        {fromOsm
          ? 'Location data © OpenStreetMap contributors. Photo is illustrative.'
          : `Details checked ${gym.data_verified_at ? shortDate(gym.data_verified_at) : 'recently'}.${gym.photos.length ? '' : ' Photo is illustrative.'}`}
        {hasDemoData && ' Some prices and hours here are demo data for a class project. Confirm with the gym before you go.'}
      </T>
    </View>
  );

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: wide ? space.huge : 140 }}>
        <View style={[styles.hero, wide && styles.heroWide]}>
          <Image source={cover} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        </View>
        <Column>
          <View style={[styles.sheet, wide && styles.sheetWide]}>
            {wide ? (
              <View style={styles.wideRow}>
                <View style={styles.flex}>{details}</View>
                <View style={styles.wideAside}>{passCard}</View>
              </View>
            ) : (
              details
            )}
          </View>
        </Column>
      </Animated.ScrollView>

      <View style={[styles.floating, { paddingTop: wide ? space.xxxl : insets.top + space.s }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, styles.headerBg, headerIn]} pointerEvents="none" />
        <Column style={styles.floatingRow}>
          <IconButton icon={CaretLeft} label="Back" tone="glass" onPress={() => back()} />
          <Animated.View style={[styles.headerTitle, headerIn]} pointerEvents="none">
            <T v="headline" numberOfLines={1}>
              {gym.name}
            </T>
          </Animated.View>
          <IconButton
            icon={Heart}
            label={saved ? 'Remove from saved' : 'Save gym'}
            tone="glass"
            filled={saved}
            iconColor={saved ? color.ember : color.ink}
            onPress={() => toggle(gym.id)}
          />
        </Column>
      </View>

      {!wide && (
        <View style={[styles.bar, { paddingBottom: insets.bottom + space.m }]}>
          <View style={styles.flex}>
            {option ? (
              <>
                <T v="price" c="ember">
                  {money(option.price_cents)}
                  <T v="footnote" c="muted">
                    {' '}
                    /{option.pass_type}
                  </T>
                </T>
                <T v="footnote" c="muted" numberOfLines={1}>
                  {option.name}
                </T>
              </>
            ) : (
              <T v="callout" c="muted">
                Price not listed yet
              </T>
            )}
          </View>
          <Button label="Get pass" onPress={getPass} disabled={!option} style={styles.barButton} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  hero: { height: 340, backgroundColor: color.sunken },
  heroWide: { height: 420, maxWidth: 1120, width: '100%', alignSelf: 'center', borderRadius: radius.xl, overflow: 'hidden', marginTop: space.xl },
  sheet: { marginTop: -28, backgroundColor: color.canvas, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: space.xxl, marginHorizontal: -20, paddingHorizontal: 20 },
  sheetWide: { marginTop: 0, marginHorizontal: 0, paddingHorizontal: 0 },
  wideRow: { flexDirection: 'row', gap: space.huge, alignItems: 'flex-start' },
  wideAside: { width: 380 },
  details: { gap: space.xxl },
  titleBlock: { gap: space.m },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  mapsLink: { alignSelf: 'flex-start' },
  passCard: { gap: space.m },
  passCardWide: { backgroundColor: color.card, borderRadius: radius.xl, padding: space.xxl, gap: space.l },
  options: { gap: space.s },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    padding: space.l,
    borderRadius: radius.l,
    borderWidth: 1.5,
    borderColor: color.line,
    backgroundColor: color.card,
  },
  optionOn: { borderColor: color.cobalt, backgroundColor: color.card },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: color.cobalt },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.cobalt },
  confidence: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  confidenceText: { fontSize: 11.5 },
  noPrice: { padding: space.l, borderRadius: radius.l, backgroundColor: color.sunken, gap: 4 },
  note: { flexDirection: 'row', gap: space.m, padding: space.l, borderRadius: radius.l, backgroundColor: color.emberTint },
  block: { gap: space.m },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.m, columnGap: space.xl },
  amenity: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 140 },
  facts: { backgroundColor: color.card, borderRadius: radius.l, paddingHorizontal: space.l },
  fact: { flexDirection: 'row', gap: space.m, paddingVertical: space.l, alignItems: 'flex-start' },
  source: { marginTop: space.s },
  floating: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: space.s },
  floatingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m },
  headerBg: { backgroundColor: color.canvas, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  headerTitle: { flex: 1, alignItems: 'center' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.l,
    paddingHorizontal: space.xl,
    paddingTop: space.m,
    backgroundColor: color.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
  barButton: { minWidth: 150 },
});

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Heart, MapPin } from 'phosphor-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import type { GymResult } from '@/lib/api';
import { miles } from '@/lib/format';
import { gymPhoto } from '@/lib/photos';
import { styleName } from '@/lib/styles';
import { useSaved } from '@/providers/SavedProvider';
import { color, font, radius, shadow, space } from '@/theme/tokens';

import { PartnerBadge, PriceBadge } from './Badge';
import { Press } from './Press';
import { PriceTag } from './PriceTag';
import { T } from './Text';

const AMENITY_SHORT: Record<string, string> = {
  free_weights: 'Free weights',
  olympic_platforms: 'Platforms',
  cardio: 'Cardio',
  showers: 'Showers',
  lockers: 'Lockers',
  sauna: 'Sauna',
  steam_room: 'Steam',
  cold_plunge: 'Cold plunge',
  pool: 'Pool',
  childcare: 'Childcare',
  towel_service: 'Towels',
  group_classes: 'Classes',
  gear_rental: 'Gear rental',
  courts: 'Courts',
  open_24_hours: 'Open 24h',
  personal_training: 'Coaching',
  recovery: 'Recovery',
};

// Expedia-style row: square photo left, details right, price bottom-right.
export function GymCard({ gym, wide }: { gym: GymResult; wide?: boolean }) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(gym.gym_id);
  const size = wide ? 168 : 116;
  const styles2 = gym.style_slugs.filter((s) => s !== 'general_fitness');
  const overline = (styles2.length ? styles2 : gym.style_slugs).slice(0, 2).map(styleName).join(' · ');
  const amenities = gym.amenity_slugs.map((a) => AMENITY_SHORT[a]).filter(Boolean).slice(0, 3).join(' · ');
  const distance = miles(gym.distance_m);

  return (
    <Press
      onPress={() => router.push({ pathname: '/gym/[slug]', params: { slug: gym.slug } })}
      scaleTo={0.985}
      accessibilityRole="link"
      accessibilityLabel={`${gym.name}, ${gym.city}${distance ? `, ${distance} away` : ''}`}
      style={[styles.card, shadow.card]}>
      <View style={{ width: size, height: size }}>
        <Image source={gymPhoto(gym, wide ? 520 : 360)} style={styles.photo} contentFit="cover" transition={250} />
        <Press
          onPress={() => toggle(gym.gym_id)}
          scaleTo={0.85}
          haptic={false}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={saved ? `Remove ${gym.name} from saved` : `Save ${gym.name}`}
          style={styles.heart}>
          <Heart size={17} weight={saved ? 'fill' : 'bold'} color={saved ? color.ember : color.ink} />
        </Press>
        {gym.is_partner && (
          <View style={styles.partner}>
            <PartnerBadge />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.top}>
          {overline ? (
            <T v="overline" c="cobalt" numberOfLines={1}>
              {overline}
            </T>
          ) : null}
          <T v="headline" numberOfLines={2} style={wide && styles.nameWide}>
            {gym.name}
          </T>
          <View style={styles.meta}>
            <MapPin size={13} color={color.muted} weight="fill" />
            <T v="footnote" c="ink2" numberOfLines={1} style={styles.metaText}>
              {gym.city}
              {distance ? ` · ${distance}` : ''}
            </T>
          </View>
          <T v="footnote" c="muted" numberOfLines={1}>
            {amenities || gym.address_line1 || ' '}
          </T>
        </View>
        <View style={styles.bottom}>
          <PriceBadge confidence={gym.min_price_confidence} />
          <View style={styles.price}>
            <PriceTag cents={gym.min_price_cents} unit={gym.min_price_pass_type} />
          </View>
        </View>
      </View>
    </Press>
  );
}

export function GymCardSkeleton({ wide }: { wide?: boolean }) {
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 750 }), -1, true));
  }, [pulse]);
  const fade = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  const size = wide ? 168 : 116;
  return (
    <Animated.View style={[styles.card, shadow.card, fade]}>
      <View style={[styles.photo, styles.block, { width: size, height: size }]} />
      <View style={[styles.body, { gap: 10 }]}>
        <View style={[styles.block, { width: '40%', height: 10 }]} />
        <View style={[styles.block, { width: '85%', height: 16 }]} />
        <View style={[styles.block, { width: '55%', height: 12 }]} />
        <View style={[styles.block, { width: '30%', height: 22, alignSelf: 'flex-end', marginTop: 'auto' }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space.m + 2,
    padding: 10,
    borderRadius: radius.l,
    backgroundColor: color.card,
  },
  photo: { width: '100%', height: '100%', borderRadius: radius.m, backgroundColor: color.sunken },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partner: { position: 'absolute', left: 8, bottom: 8 },
  body: { flex: 1, justifyContent: 'space-between', paddingVertical: 2, paddingRight: 4 },
  top: { gap: 3 },
  nameWide: { fontSize: 18, lineHeight: 23 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { flexShrink: 1, fontFamily: font.semibold },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.s, marginTop: space.s },
  price: { marginLeft: 'auto' },
  block: { backgroundColor: color.sunken, borderRadius: 6 },
});

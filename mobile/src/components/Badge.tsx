import { Handshake, Info, Lightning, QrCode, SealCheck, type Icon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import type { PriceConfidence } from '@/lib/api';
import type { Enums } from '@/lib/database.types';
import { color, font, radius } from '@/theme/tokens';

import { T } from './Text';

type Tone = 'neutral' | 'partner' | 'active';
type PassStatusValue = Enums<'pass_status'>;

const tones: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: color.sunken, fg: color.ink2 },
  partner: { bg: color.ink, fg: color.onDark },
  active: { bg: color.mintTint, fg: '#0B7A4B' },
};

export function Badge({ label, tone = 'neutral', icon: IconCmp }: { label: string; tone?: Tone; icon?: Icon }) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {IconCmp && <IconCmp size={12} color={t.fg} weight="bold" />}
      <T v="footnote" style={[styles.label, { color: t.fg }]}>
        {label}
      </T>
    </View>
  );
}

export const PartnerBadge = () => <Badge label="Partner" tone="partner" icon={Handshake} />;
export const ActiveBadge = () => <Badge label="Active" tone="active" icon={Lightning} />;

export function PassStatus({ status }: { status: PassStatusValue }) {
  if (status === 'active') return <ActiveBadge />;
  if (status === 'inactive') return <Badge label="Ready to use" icon={QrCode} />;
  return <Badge label={status === 'expired' ? 'Expired' : 'Cancelled'} />;
}

// How much to trust a listed price (pass_options.price_confidence).
export function PriceBadge({ confidence }: { confidence: PriceConfidence | null }) {
  if (confidence === 'official') return <Badge label="Verified price" icon={SealCheck} />;
  if (confidence === 'third_party') return <Badge label="Estimated price" icon={Info} />;
  return null;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  label: { fontFamily: font.bold, fontSize: 11, lineHeight: 14 },
});

import { useLocalSearchParams } from 'expo-router';
import { WarningCircle } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { PassStatus } from '@/components/Badge';
import { back, EmptyState, ScreenHeader, ScrollScreen } from '@/components/layout';
import { T } from '@/components/Text';
import { getPass, type PassWithGym } from '@/lib/api';
import { passLength, shortDate, timeLeft } from '@/lib/format';
import { color, font, layout, radius, shadow, space } from '@/theme/tokens';

export default function PassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pass, setPass] = useState<PassWithGym | null | undefined>(undefined);
  const waiting = pass?.status === 'inactive';

  useEffect(() => {
    getPass(id)
      .then(setPass)
      .catch(() => setPass(null));
  }, [id]);

  // While the ticket waits at the desk, check every few seconds so it flips to Active the moment staff scan it.
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      getPass(id)
        .then((p) => p && p.status !== 'inactive' && setPass(p))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [id, waiting]);

  if (pass === undefined) return <ActivityIndicator color={color.ink} style={{ flex: 1, backgroundColor: color.canvas }} />;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Your pass" width={layout.ticket} />
      {pass === null ? (
        <EmptyState icon={WarningCircle} title="Pass not found" body="It may belong to another account." action="Go back" onAction={() => back()} />
      ) : (
        <ScrollScreen width={layout.ticket} gap={space.xxl} contentContainerStyle={styles.content}>
          <View style={[styles.ticket, shadow.float, pass.status === 'active' && styles.ticketActive]}>
            <View style={styles.ticketHead}>
              <T v="overline" c="onDarkMuted">
                {pass.gyms?.city}
              </T>
              <T v="title2" c="onDark">
                {pass.gyms?.name}
              </T>
              <T v="callout" c="onDarkMuted">
                {pass.pass_type[0].toUpperCase() + pass.pass_type.slice(1)} pass · {passLength(pass.duration_days)}
              </T>
            </View>
            <View style={styles.qrWrap}>
              <QRCode value={pass.code} size={208} color={color.ink} backgroundColor={color.card} />
              <T v="title3" style={styles.code} selectable>
                {pass.short_code.slice(0, 4)}-{pass.short_code.slice(4)}
              </T>
            </View>
            <View style={styles.ticketFoot}>
              <PassStatus status={pass.status} />
              <T v="footnote" c="muted">
                {pass.status === 'active' && pass.expires_at
                  ? `${timeLeft(pass.expires_at)} · until ${shortDate(pass.expires_at)}`
                  : pass.status === 'inactive'
                    ? 'Show this at the front desk'
                    : pass.expires_at
                      ? `Ended ${shortDate(pass.expires_at)}`
                      : ''}
              </T>
            </View>
          </View>

          <T v="footnote" c="muted" style={styles.center}>
            {pass.status === 'inactive'
              ? `Staff scan the QR or type the code. Your ${passLength(pass.duration_days)} pass starts then.`
              : pass.status === 'active'
                ? 'Checked in. Show this again if the desk asks.'
                : 'This pass has ended.'}
          </T>
        </ScrollScreen>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  content: { paddingTop: space.s },
  ticket: { borderRadius: radius.xl, backgroundColor: color.card, overflow: 'hidden' },
  ticketActive: { borderWidth: 2, borderColor: color.mint },
  ticketHead: { backgroundColor: color.ink, padding: space.xxl, gap: 4 },
  qrWrap: { alignItems: 'center', paddingVertical: space.xxl, gap: space.m },
  code: { fontFamily: font.extrabold, letterSpacing: 3 },
  ticketFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.l,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
    borderStyle: 'dashed',
  },
  center: { textAlign: 'center' },
});

import { useLocalSearchParams } from 'expo-router';
import { Lightning, WarningCircle } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { PassStatus } from '@/components/Badge';
import { Button } from '@/components/Button';
import { back, EmptyState, ScreenHeader, ScrollScreen } from '@/components/layout';
import { T } from '@/components/Text';
import { activatePass, getPass, type PassWithGym } from '@/lib/api';
import { passLength, shortDate, timeLeft } from '@/lib/format';
import { color, font, radius, shadow, space } from '@/theme/tokens';

export default function PassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pass, setPass] = useState<PassWithGym | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPass(id)
      .then(setPass)
      .catch(() => setPass(null));
  }, [id]);

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      await activatePass(id);
      setPass(await getPass(id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (pass === undefined) return <ActivityIndicator color={color.ink} style={{ flex: 1, backgroundColor: color.canvas }} />;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Your pass" />
      {pass === null ? (
        <EmptyState icon={WarningCircle} title="Pass not found" body="It may belong to another account." action="Go back" onAction={() => back()} />
      ) : (
        <ScrollScreen contentContainerStyle={styles.content}>
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
              <T v="footnote" c="muted" style={styles.code}>
                {pass.code.slice(0, 4).toUpperCase()} {pass.code.slice(4, 8).toUpperCase()} {pass.code.slice(-4).toUpperCase()}
              </T>
            </View>
            <View style={styles.ticketFoot}>
              <PassStatus status={pass.status} />
              <T v="footnote" c="muted">
                {pass.status === 'active' && pass.expires_at
                  ? `${timeLeft(pass.expires_at)} · until ${shortDate(pass.expires_at)}`
                  : pass.status === 'inactive'
                    ? 'Activate when you arrive'
                    : pass.expires_at
                      ? `Ended ${shortDate(pass.expires_at)}`
                      : ''}
              </T>
            </View>
          </View>

          {pass.status === 'inactive' && (
            <View style={styles.actions}>
              <Button label="Activate pass" icon={Lightning} onPress={activate} loading={busy} />
              <T v="footnote" c="muted" style={styles.center}>
                Only activate at the front desk. Your {passLength(pass.duration_days)} start the moment you tap.
              </T>
            </View>
          )}
          {error && (
            <T v="callout" c="danger" style={styles.center}>
              {error}
            </T>
          )}
        </ScrollScreen>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  content: { gap: space.xxl, maxWidth: 460, paddingTop: space.s },
  ticket: { borderRadius: radius.xl, backgroundColor: color.card, overflow: 'hidden' },
  ticketActive: { borderWidth: 2, borderColor: color.mint },
  ticketHead: { backgroundColor: color.ink, padding: space.xxl, gap: 4 },
  qrWrap: { alignItems: 'center', paddingVertical: space.xxl, gap: space.m },
  code: { fontFamily: font.bold, letterSpacing: 2 },
  ticketFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.l,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
    borderStyle: 'dashed',
  },
  actions: { gap: space.m },
  center: { textAlign: 'center' },
});

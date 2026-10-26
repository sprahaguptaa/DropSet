import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { CreditCard, Info, QrCode, Ticket, WarningCircle } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { back, EmptyState, ScreenHeader, ScrollScreen } from '@/components/layout';
import { T } from '@/components/Text';
import { demoCheckout, getPassOption } from '@/lib/api';
import { money, passLength } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import { color, layout, radius, shadow, space } from '@/theme/tokens';

type Option = NonNullable<Awaited<ReturnType<typeof getPassOption>>>;

const STEPS = [
  { icon: CreditCard, title: 'Pay', body: 'Demo checkout: no card is charged and no money moves.' },
  { icon: Ticket, title: 'Your ticket lands in Passes', body: 'A QR code plus a short code, ready whenever you get there.' },
  { icon: QrCode, title: 'Scan at the front desk', body: 'Staff scan the QR or type the code. Your pass starts then.' },
];

// Order summary + simulated payment (demo_checkout). Stripe test mode replaces the Pay step later (ROADMAP Phase 8).
export default function Checkout() {
  const { optionId } = useLocalSearchParams<{ optionId: string }>();
  const { ready, session } = useAuth();
  const [option, setOption] = useState<Option | null | undefined>(undefined);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPassOption(optionId)
      .then(setOption)
      .catch(() => setOption(null));
  }, [optionId]);

  if (ready && !session) return <Redirect href={{ pathname: '/login', params: { next: `/checkout/${optionId}` } }} />;

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      const passId = await demoCheckout(optionId);
      router.replace({ pathname: '/pass/[id]', params: { id: passId } });
    } catch {
      setError('Couldn’t complete the purchase. Try again.');
      setPaying(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Checkout" width={layout.form} />
      {option === undefined ? (
        <ActivityIndicator color={color.ink} style={{ marginTop: space.huge }} />
      ) : option === null ? (
        <EmptyState icon={WarningCircle} title="Pass not available" body="This pass option was removed. Pick another one." action="Go back" onAction={() => back()} />
      ) : (
        <ScrollScreen width={layout.form} gap={space.xxl}>
          <View style={[styles.summary, shadow.card]}>
            <T v="overline" c="muted">
              {option.gyms?.city}
            </T>
            <T v="title2">{option.gyms?.name}</T>
            <View style={styles.rule} />
            <View style={styles.line}>
              <View style={styles.flex}>
                <T v="headline">{option.name}</T>
                <T v="footnote" c="muted">
                  {passLength(option.duration_days)} from activation
                </T>
              </View>
              <T v="price" c="ember">
                {money(option.price_cents)}
              </T>
            </View>
            <View style={styles.rule} />
            <View style={styles.line}>
              <T v="bodyStrong" style={styles.flex}>
                Total
              </T>
              <T v="title3">{money(option.price_cents)}</T>
            </View>
          </View>

          <View style={styles.steps}>
            {STEPS.map((s) => (
              <View key={s.title} style={styles.step}>
                <View style={styles.stepIcon}>
                  <s.icon size={20} color={color.ink} />
                </View>
                <View style={styles.flex}>
                  <T v="headline">{s.title}</T>
                  <T v="callout" c="muted">
                    {s.body}
                  </T>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.notice}>
            <Info size={18} color={color.ink} weight="bold" />
            <T v="callout" c="ink2" style={styles.flex}>
              Demo checkout for our class project. You get a real, scannable pass, but no card is charged.
            </T>
          </View>
          {error && (
            <T v="callout" c="danger">
              {error}
            </T>
          )}
          <Button label={`Pay ${money(option.price_cents)} · demo`} onPress={pay} loading={paying} />
        </ScrollScreen>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  flex: { flex: 1 },
  summary: { backgroundColor: color.card, borderRadius: radius.xl, padding: space.xxl, gap: space.m },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.l },
  steps: { gap: space.xl },
  step: { flexDirection: 'row', gap: space.l },
  stepIcon: { width: 40, height: 40, borderRadius: radius.m, backgroundColor: color.sunken, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', gap: space.m, padding: space.l, borderRadius: radius.l, backgroundColor: color.sunken },
});

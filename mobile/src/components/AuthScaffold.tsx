import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { color, layout, radius, shadow, space } from '@/theme/tokens';

import { ScreenHeader, ScrollScreen, useWide } from './layout';
import { Mark } from './Logo';
import { T } from './Text';

const CARD = 460; // sign-in card width on wide screens; the header lines up with it

// Shared frame for log in / sign up / password screens. A centered card on wide web.
export function AuthScaffold({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const wide = useWide();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader width={wide ? CARD + layout.gutter * 2 : undefined} />
      <ScrollScreen contentContainerStyle={wide && styles.wideContent}>
        <View style={[styles.body, wide && [styles.card, shadow.card]]}>
          <Mark size={40} />
          <View style={styles.titles}>
            <T v="title1">{title}</T>
            <T v="body" c="muted">
              {subtitle}
            </T>
          </View>
          {children}
        </View>
      </ScrollScreen>
    </KeyboardAvoidingView>
  );
}

export const authStyles = StyleSheet.create({
  form: { gap: space.l },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: space.s },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  banner: { padding: space.l, borderRadius: radius.m, gap: 4 },
});

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.canvas },
  wideContent: { paddingTop: space.xxl },
  body: { gap: space.xxl, paddingTop: space.s },
  card: { width: CARD, alignSelf: 'center', backgroundColor: color.card, borderRadius: 28, padding: space.xxxl + 4 },
  titles: { gap: space.s },
});

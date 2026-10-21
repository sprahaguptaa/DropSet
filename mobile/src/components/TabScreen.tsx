import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space } from '@/theme/tokens';

import { Column, useWide } from './layout';
import { T } from './Text';

// Big left-aligned title for the top of a tab (Saved, Passes, Profile).
export function TabTitle({ title, subtitle, width }: { title: string; subtitle?: string; width?: number }) {
  const insets = useSafeAreaInsets();
  const wide = useWide();
  return (
    <View style={[styles.wrap, { paddingTop: wide ? space.xxxl : insets.top + space.l }]}>
      <Column width={width} style={styles.inner}>
        <T v="title1" style={wide && styles.wide}>
          {title}
        </T>
        {subtitle ? (
          <T v="body" c="muted">
            {subtitle}
          </T>
        ) : null}
      </Column>
    </View>
  );
}

export function TabBody({ children }: { children: ReactNode }) {
  return <View style={styles.body}>{children}</View>;
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: color.canvas, paddingBottom: space.l },
  inner: { gap: 4 },
  wide: { fontSize: 44, lineHeight: 46, letterSpacing: -1.6 },
  body: { flex: 1, backgroundColor: color.canvas },
});

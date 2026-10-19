import { router } from 'expo-router';
import { CaretLeft, X, type Icon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, layout, radius, shadow, space } from '@/theme/tokens';

import { Button } from './Button';
import { Press } from './Press';
import { T } from './Text';

// True on tablets / desktop browsers, where screens switch to two columns.
export function useWide() {
  return useWindowDimensions().width >= layout.wide;
}

// Centers content in a readable column on wide web screens.
export function Column({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.column, style]}>{children}</View>;
}

export function ScrollScreen({ children, contentContainerStyle, ...rest }: ScrollViewProps & { children: ReactNode }) {
  return (
    <ScrollView
      {...rest}
      style={styles.screen}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <Column>{children}</Column>
    </ScrollView>
  );
}

export function IconButton({
  icon: IconCmp,
  onPress,
  label,
  tone = 'card',
  filled,
  iconColor,
}: {
  icon: Icon;
  onPress: () => void;
  label: string;
  tone?: 'card' | 'glass';
  filled?: boolean;
  iconColor?: string;
}) {
  return (
    <Press
      onPress={onPress}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.iconButton, tone === 'glass' ? styles.glass : shadow.card]}>
      <IconCmp size={20} color={iconColor ?? color.ink} weight={filled ? 'fill' : 'bold'} />
    </Press>
  );
}

export function back(fallback: '/explore' | '/' = '/explore') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

// Top bar for pushed screens: back (or close) button, title, optional right slot.
export function ScreenHeader({
  title,
  subtitle,
  right,
  close,
  onBack,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  close?: boolean;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.s }]}>
      <Column style={styles.headerRow}>
        <IconButton icon={close ? X : CaretLeft} label={close ? 'Close' : 'Back'} onPress={onBack ?? (() => back())} />
        <View style={styles.headerText}>
          {title ? (
            <T v="title3" numberOfLines={1}>
              {title}
            </T>
          ) : null}
          {subtitle ? (
            <T v="footnote" c="muted" numberOfLines={1}>
              {subtitle}
            </T>
          ) : null}
        </View>
        <View style={styles.headerRight}>{right}</View>
      </Column>
    </View>
  );
}

export function EmptyState({
  icon: IconCmp,
  title,
  body,
  action,
  onAction,
}: {
  icon: Icon;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <IconCmp size={28} color={color.ink} weight="duotone" />
      </View>
      <T v="title2" style={styles.center}>
        {title}
      </T>
      <T v="body" c="muted" style={[styles.center, styles.emptyBody]}>
        {body}
      </T>
      {action && onAction ? <Button label={action} onPress={onAction} size="m" style={styles.emptyAction} /> : null}
    </View>
  );
}

export function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <T v="title3">{title}</T>
        {action && onAction ? (
          <Press onPress={onAction} haptic={false} accessibilityRole="link">
            <T v="callout" c="cobalt" style={styles.link}>
              {action}
            </T>
          </Press>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export const webOnly = (style: ViewStyle) => (Platform.OS === 'web' ? style : undefined);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  scrollContent: { paddingBottom: 120 },
  column: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', paddingHorizontal: layout.gutter },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glass: { backgroundColor: 'rgba(255,255,255,0.92)' },
  header: { backgroundColor: color.canvas, paddingBottom: space.m },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  headerText: { flex: 1 },
  headerRight: { minWidth: 40, alignItems: 'flex-end' },
  empty: { alignItems: 'center', paddingVertical: space.huge, paddingHorizontal: space.xxl, gap: space.s },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.s,
  },
  emptyBody: { maxWidth: 340 },
  emptyAction: { marginTop: space.l, minWidth: 180 },
  center: { textAlign: 'center' },
  section: { gap: space.m, marginTop: space.xxxl },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  link: { fontFamily: 'PlusJakartaSans_700Bold' },
});

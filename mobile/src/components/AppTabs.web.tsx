import { router } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Heart, MagnifyingGlass, Ticket, UserCircle, type Icon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { color, font, layout, space } from '@/theme/tokens';

import { Button } from './Button';
import { Column, useWide } from './layout';
import { Logo } from './Logo';
import { T } from './Text';

const TABS = [
  { name: 'explore', href: '/explore', label: 'Explore', icon: MagnifyingGlass },
  { name: 'saved', href: '/saved', label: 'Saved', icon: Heart },
  { name: 'passes', href: '/passes', label: 'Passes', icon: Ticket },
  { name: 'profile', href: '/profile', label: 'Profile', icon: UserCircle },
] as const;

type ItemProps = Omit<TabTriggerSlotProps, 'ref'> & { label: string; icon: Icon; wide: boolean };

function NavItem({ isFocused, label, icon: IconCmp, wide, ...props }: ItemProps) {
  if (wide) {
    return (
      <Pressable {...props} style={styles.topItem} accessibilityRole="link">
        <T v="callout" c={isFocused ? 'ink' : 'muted'} style={{ fontFamily: isFocused ? font.bold : font.semibold }}>
          {label}
        </T>
        <View style={[styles.underline, isFocused && styles.underlineOn]} />
      </Pressable>
    );
  }
  return (
    <Pressable {...props} style={styles.bottomItem} accessibilityRole="link">
      <IconCmp size={24} color={isFocused ? color.ink : color.muted} weight={isFocused ? 'fill' : 'regular'} />
      <T v="footnote" c={isFocused ? 'ink' : 'muted'} style={[styles.bottomLabel, isFocused && { fontFamily: font.bold }]}>
        {label}
      </T>
    </Pressable>
  );
}

export default function AppTabs() {
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const triggers = TABS.map((t) => (
    <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
      <NavItem label={t.label} icon={t.icon} wide={wide} />
    </TabTrigger>
  ));

  return (
    <Tabs style={styles.root}>
      {wide && (
        <View style={styles.topBar}>
          <Column style={styles.topRow}>
            <Pressable onPress={() => router.navigate('/explore')} accessibilityRole="link" accessibilityLabel="DropSet home">
              <Logo size={28} />
            </Pressable>
            <TabList asChild>
              <View style={styles.topNav}>{triggers}</View>
            </TabList>
            <View style={styles.topRight}>
              {!session && <Button label="Log in" variant="dark" size="s" onPress={() => router.push('/login')} />}
            </View>
          </Column>
        </View>
      )}
      <TabSlot style={styles.slot} />
      {!wide && (
        <TabList asChild>
          <View style={StyleSheet.flatten([styles.bottomBar, { paddingBottom: Math.max(insets.bottom, space.s) }])}>{triggers}</View>
        </TabList>
      )}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  slot: { flex: 1 },
  topBar: { backgroundColor: color.canvas, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  topRow: { height: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: layout.maxWidth },
  topNav: { flexDirection: 'row', gap: space.xxl, height: '100%' },
  topItem: { height: '100%', justifyContent: 'center', alignItems: 'center' },
  underline: { position: 'absolute', bottom: -1, height: 2, left: 0, right: 0, backgroundColor: 'transparent' },
  underlineOn: { backgroundColor: color.ink },
  topRight: { minWidth: 120, alignItems: 'flex-end' },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: color.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
    paddingTop: space.s,
  },
  bottomItem: { flex: 1, alignItems: 'center', gap: 2 },
  bottomLabel: { fontSize: 11, lineHeight: 14 },
});

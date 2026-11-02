import { router, useFocusEffect } from 'expo-router';
import { CaretRight, SignIn, Ticket } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, View } from 'react-native';

import { Badge, PassStatus } from '@/components/Badge';
import { EmptyState } from '@/components/layout';
import { Press } from '@/components/Press';
import { TabBody, TabTitle } from '@/components/TabScreen';
import { T } from '@/components/Text';
import { getPasses, type PassWithGym } from '@/lib/api';
import { passLength, shortDate, timeLeft } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import { color, layout, radius, shadow, space } from '@/theme/tokens';

type Group = 'ready' | 'active' | 'used';

const SECTIONS: { key: Group; title: string }[] = [
  { key: 'ready', title: 'Ready to use' },
  { key: 'active', title: 'Active' },
  { key: 'used', title: 'Used' },
];

const DAY_MS = 864e5;

// The expiry job runs every few minutes, so an active pass past its end time already counts as used.
function groupOf(pass: PassWithGym, now: number): Group {
  if (pass.status === 'inactive') return 'ready';
  if (pass.status === 'active' && pass.expires_at && new Date(pass.expires_at).getTime() > now) return 'active';
  return 'used';
}

function detail(pass: PassWithGym, group: Group) {
  if (group === 'ready') return `Bought ${shortDate(pass.created_at)}`;
  if (group === 'active') return timeLeft(pass.expires_at!);
  if (pass.status === 'cancelled') return 'Cancelled';
  return pass.activated_at ? `Used ${shortDate(pass.activated_at)}` : `Ended ${shortDate(pass.expires_at ?? pass.updated_at)}`;
}

function PassRow({ pass, group, now }: { pass: PassWithGym; group: Group; now: number }) {
  const active = group === 'active';
  const isNew = group === 'ready' && now - new Date(pass.created_at).getTime() < DAY_MS;
  return (
    <Press
      onPress={() => router.push({ pathname: '/pass/[id]', params: { id: pass.id } })}
      scaleTo={0.985}
      style={[styles.pass, shadow.card, active && styles.passActive, group === 'used' && styles.passUsed]}>
      <View style={[styles.stub, active && { backgroundColor: color.mint }]}>
        <Ticket size={22} color={active ? color.card : color.ink} weight="fill" />
      </View>
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <T v="headline" numberOfLines={1} style={styles.name}>
            {pass.gyms?.name ?? 'Gym'}
          </T>
          {isNew && <Badge label="New" tone="ink" />}
        </View>
        <T v="footnote" c="muted">
          {pass.pass_type[0].toUpperCase() + pass.pass_type.slice(1)} pass · {passLength(pass.duration_days)}
        </T>
        <View style={styles.statusRow}>
          <PassStatus status={group === 'used' && pass.status === 'active' ? 'expired' : pass.status} />
          <T v="footnote" c="muted">
            {detail(pass, group)}
          </T>
        </View>
      </View>
      <CaretRight size={18} color={color.muted} weight="bold" />
    </Press>
  );
}

export default function Passes() {
  const { session } = useAuth();
  // Stamped with the time they loaded, so grouping (active vs used, New) stays stable between renders.
  const [loaded, setLoaded] = useState<{ passes: PassWithGym[]; now: number } | null>(null);
  const passes = loaded?.passes ?? null;
  const now = loaded?.now ?? 0;

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      getPasses()
        .then((p) => setLoaded({ passes: p, now: Date.now() }))
        .catch(() => setLoaded({ passes: [], now: Date.now() }));
    }, [session]),
  );

  // Newest first within each section (getPasses orders by purchase date), so a pass you just bought is on top.
  const sections = SECTIONS.map((s) => ({ ...s, data: (passes ?? []).filter((p) => groupOf(p, now) === s.key) })).filter(
    (s) => s.data.length,
  );

  return (
    <TabBody>
      <TabTitle width={layout.list} title="Passes" subtitle={session ? 'Show the QR code at the front desk.' : undefined} />
      {!session ? (
        <EmptyState
          icon={SignIn}
          title="Your passes live here"
          body="Log in to buy a pass and check in with a QR code."
          action="Log in"
          onAction={() => router.push('/login')}
        />
      ) : passes == null ? (
        <ActivityIndicator color={color.ink} style={{ marginTop: space.huge }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(p) => p.id}
          renderItem={({ item, section }) => <PassRow pass={item} group={section.key} now={now} />}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHead}>
              <T v="title3">{section.title}</T>
              <T v="callout" c="muted">
                {section.data.length}
              </T>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: space.m }} />}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
          ListEmptyComponent={
            <EmptyState
              icon={Ticket}
              title="No passes yet"
              body="Find a gym, pick a day, week or month pass, and it shows up here."
              action="Find a gym"
              onAction={() => router.navigate('/explore')}
            />
          }
        />
      )}
    </TabBody>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  list: { paddingHorizontal: layout.gutter, width: '100%', maxWidth: layout.list, alignSelf: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.s, paddingTop: space.xl, paddingBottom: space.m },
  pass: { flexDirection: 'row', alignItems: 'center', gap: space.l, padding: space.l, borderRadius: radius.l, backgroundColor: color.card },
  passActive: { borderWidth: 1.5, borderColor: color.mint },
  passUsed: { opacity: 0.72 },
  stub: { width: 48, height: 48, borderRadius: radius.m, backgroundColor: color.sunken, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  name: { flexShrink: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: 6 },
});

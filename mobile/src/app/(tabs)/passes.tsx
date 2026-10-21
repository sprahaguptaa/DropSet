import { router, useFocusEffect } from 'expo-router';
import { CaretRight, SignIn, Ticket } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { PassStatus } from '@/components/Badge';
import { EmptyState } from '@/components/layout';
import { Press } from '@/components/Press';
import { TabBody, TabTitle } from '@/components/TabScreen';
import { T } from '@/components/Text';
import { getPasses, type PassWithGym } from '@/lib/api';
import { passLength, shortDate, timeLeft } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import { color, layout, radius, shadow, space } from '@/theme/tokens';

function PassRow({ pass }: { pass: PassWithGym }) {
  const active = pass.status === 'active';
  return (
    <Press
      onPress={() => router.push({ pathname: '/pass/[id]', params: { id: pass.id } })}
      scaleTo={0.985}
      style={[styles.pass, shadow.card, active && styles.passActive]}>
      <View style={[styles.stub, active && { backgroundColor: color.mint }]}>
        <Ticket size={22} color={active ? color.card : color.ink} weight="fill" />
      </View>
      <View style={styles.flex}>
        <T v="headline" numberOfLines={1}>
          {pass.gyms?.name ?? 'Gym'}
        </T>
        <T v="footnote" c="muted">
          {pass.pass_type[0].toUpperCase() + pass.pass_type.slice(1)} pass · {passLength(pass.duration_days)}
        </T>
        <View style={styles.statusRow}>
          <PassStatus status={pass.status} />
          <T v="footnote" c="muted">
            {active && pass.expires_at ? timeLeft(pass.expires_at) : `Bought ${shortDate(pass.created_at)}`}
          </T>
        </View>
      </View>
      <CaretRight size={18} color={color.muted} weight="bold" />
    </Press>
  );
}

export default function Passes() {
  const { session } = useAuth();
  const [passes, setPasses] = useState<PassWithGym[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      getPasses()
        .then(setPasses)
        .catch(() => setPasses([]));
    }, [session]),
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
        <FlatList
          data={passes}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PassRow pass={item} />}
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
  list: { gap: space.m, paddingHorizontal: layout.gutter, width: '100%', maxWidth: layout.list, alignSelf: 'center' },
  pass: { flexDirection: 'row', alignItems: 'center', gap: space.l, padding: space.l, borderRadius: radius.l, backgroundColor: color.card },
  passActive: { borderWidth: 1.5, borderColor: color.mint },
  stub: { width: 48, height: 48, borderRadius: radius.m, backgroundColor: color.sunken, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: 6 },
});

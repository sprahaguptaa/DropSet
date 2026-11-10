import { router, useFocusEffect } from 'expo-router';
import { HandsClapping, SignIn, Trophy, UsersThree } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/layout';
import { displayName, openProfile } from '@/components/People';
import { Press } from '@/components/Press';
import { NudgeBanner, UsernameCard } from '@/components/Social';
import { TabBody, TabTitle } from '@/components/TabScreen';
import { T } from '@/components/Text';
import { FEED_PAGE, getFeed, reportUser, toggleProps, type FeedItem } from '@/lib/api';
import { ago } from '@/lib/format';
import { goalTitle } from '@/lib/goals';
import { kindOf } from '@/lib/workouts';
import { useAuth } from '@/providers/AuthProvider';
import { color, font, layout, radius, shadow, space } from '@/theme/tokens';

function FeedCard({ item, mine, now, userId }: { item: FeedItem; mine: boolean; now: number; userId: string }) {
  const [propped, setPropped] = useState(item.i_propped);
  const [count, setCount] = useState(item.props);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<'idle' | 'confirm' | 'done'>('idle');
  const name = displayName(item);
  const k = item.kind ? kindOf(item.kind) : null;

  async function props() {
    setBusy(true);
    try {
      const on = await toggleProps(item);
      setPropped(on);
      setCount((c) => c + (on ? 1 : -1));
    } catch {
      // e.g. they just made check-ins private; leave it as it was
    } finally {
      setBusy(false);
    }
  }

  async function onReport() {
    if (report === 'idle') return setReport('confirm');
    try {
      await reportUser(userId, item.user_id, item.item_type === 'workout' ? item.item_id : null);
      setReport('done');
    } catch {
      setReport('idle');
    }
  }

  return (
    <View style={[styles.card, shadow.card]}>
      <Press onPress={() => openProfile(item.username)} haptic={false} accessibilityRole="link" style={styles.who}>
        <Avatar url={item.avatar_url} name={name} size={40} />
        <View style={styles.flex}>
          <T v="headline" numberOfLines={1}>
            {mine ? 'You' : name}
          </T>
          <T v="footnote" c="muted">
            {ago(item.at, now)}
          </T>
        </View>
      </Press>

      {item.item_type === 'goal_hit' ? (
        <View style={styles.what}>
          <View style={[styles.icon, styles.iconHit]}>
            <Trophy size={20} color={color.onDark} weight="fill" />
          </View>
          <View style={styles.flex}>
            <T v="overline" c="muted">
              Goal hit
            </T>
            <T v="title3">
              {goalTitle({ kind: item.goal_kind!, lift: item.goal_lift, unit: item.goal_unit!, start_value: 0, target_value: item.goal_target!, achieved_at: item.at })}
            </T>
          </View>
        </View>
      ) : (
        <View style={styles.what}>
          <View style={styles.icon}>{k && <k.icon size={20} color={color.ink} weight="bold" />}</View>
          <View style={styles.flex}>
            <T v="title3">
              {k?.past ?? 'Trained'}
              {item.gym_name ? ` at ${item.gym_name}` : ''}
            </T>
            {item.note ? (
              <T v="callout" c="ink2">
                {item.note}
              </T>
            ) : null}
          </View>
        </View>
      )}

      <View style={styles.foot}>
        {mine ? (
          <T v="footnote" c="muted">
            {count ? `${count} prop${count === 1 ? '' : 's'}` : ' '}
          </T>
        ) : (
          <Press
            onPress={props}
            disabled={busy}
            haptic
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityState={{ selected: propped }}
            accessibilityLabel={propped ? 'Remove props' : 'Give props'}
            style={[styles.props, propped && styles.propsOn]}>
            <HandsClapping size={18} color={propped ? color.cobalt : color.ink2} weight={propped ? 'fill' : 'regular'} />
            <T v="footnote" c={propped ? 'cobalt' : 'ink2'} style={styles.bold}>
              {count ? `Props · ${count}` : 'Props'}
            </T>
          </Press>
        )}
        {!mine && (
          <Press onPress={onReport} disabled={report === 'done'} haptic={false} hitSlop={8} accessibilityRole="button">
            <T v="footnote" c={report === 'confirm' ? 'danger' : 'muted'}>
              {report === 'done' ? 'Reported. Thanks.' : report === 'confirm' ? 'Tap again to report' : 'Report'}
            </T>
          </Press>
        )}
      </View>
    </View>
  );
}

// Check-ins and goal hits from you and the people you follow.
export default function Feed() {
  const { session, profile } = useAuth();
  const userId = session?.user.id ?? null;
  // Stamped with load time so "3h ago" stays stable between renders.
  const [loaded, setLoaded] = useState<{ userId: string; items: FeedItem[]; now: number; more: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      getFeed()
        .then((items) => {
          setFailed(false);
          setLoaded({ userId, items, now: Date.now(), more: items.length === FEED_PAGE });
        })
        .catch(() => setFailed(true));
    }, [userId]),
  );

  const current = loaded?.userId === userId ? loaded : null;

  async function loadMore() {
    if (!current || !current.more || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await getFeed(current.items[current.items.length - 1].at);
      setLoaded({ ...current, items: [...current.items, ...next], more: next.length === FEED_PAGE });
    } catch {
      // try again on the next scroll
    } finally {
      setLoadingMore(false);
    }
  }

  const header = (
    <View style={styles.header}>
      <UsernameCard />
      <NudgeBanner />
      {profile?.username && (
        <Button label="Find people" variant="ghost" size="s" icon={UsersThree} onPress={() => router.push('/people')} style={styles.find} />
      )}
    </View>
  );

  return (
    <TabBody>
      <TabTitle width={layout.list} title="Feed" subtitle={session ? 'Check-ins and goals from people you follow.' : undefined} />
      {!session ? (
        <EmptyState icon={SignIn} title="Train together" body="Log in to follow friends and see their check-ins." action="Log in" onAction={() => router.push('/login')} />
      ) : !current ? (
        failed ? (
          <EmptyState icon={UsersThree} title="Couldn’t load your feed" body="Check your connection and try again." />
        ) : (
          <ActivityIndicator color={color.ink} style={{ marginTop: space.huge }} />
        )
      ) : (
        <FlatList
          data={current.items}
          keyExtractor={(i) => `${i.item_type}:${i.item_id}`}
          renderItem={({ item }) => <FeedCard item={item} mine={item.user_id === userId} now={current.now} userId={userId!} />}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={{ height: space.m }} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={color.ink} style={{ marginTop: space.l }} /> : undefined}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
          ListEmptyComponent={
            <EmptyState
              icon={UsersThree}
              title="Your feed is quiet"
              body="Follow friends to see their check-ins and goal hits here. Your own show up too."
              action="Find people"
              onAction={() => router.push('/people')}
            />
          }
        />
      )}
    </TabBody>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  bold: { fontFamily: font.bold },
  list: { paddingHorizontal: layout.gutter, width: '100%', maxWidth: layout.list, alignSelf: 'center' },
  header: { gap: space.m, paddingBottom: space.m },
  find: { alignSelf: 'flex-start' },
  card: { backgroundColor: color.card, borderRadius: radius.l, padding: space.l, gap: space.m },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  what: { flexDirection: 'row', alignItems: 'flex-start', gap: space.m },
  icon: { width: 40, height: 40, borderRadius: radius.m, backgroundColor: color.sunken, alignItems: 'center', justifyContent: 'center' },
  iconHit: { backgroundColor: color.ink },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  props: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: space.m,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  propsOn: { borderColor: color.cobalt, backgroundColor: color.cobaltTint },
});

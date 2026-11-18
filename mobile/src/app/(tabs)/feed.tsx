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

const keyOf = (i: FeedItem) => `${i.item_type}:${i.item_id}`;

// A fresh first page merged into what's loaded: new posts go on top, known ones get fresh counts,
// and older pages stay (so coming back to the Feed keeps your place).
function mergeFirstPage(prev: FeedItem[], fresh: FeedItem[]) {
  const freshKeys = new Set(fresh.map(keyOf));
  const oldest = fresh[fresh.length - 1]?.at;
  return [...fresh, ...prev.filter((i) => !freshKeys.has(keyOf(i)) && (!oldest || i.at < oldest))];
}

function FeedCard({
  item,
  mine,
  now,
  userId,
  onProps,
}: {
  item: FeedItem;
  mine: boolean;
  now: number;
  userId: string;
  onProps: (key: string, on: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [propsError, setPropsError] = useState(false);
  const [report, setReport] = useState<'idle' | 'confirm' | 'sending' | 'done'>('idle');
  const name = displayName(item);
  const k = item.kind ? kindOf(item.kind) : null;
  const what = item.item_type === 'goal_hit' ? 'goal hit' : 'check-in';

  async function props() {
    setBusy(true);
    setPropsError(false);
    try {
      onProps(keyOf(item), await toggleProps(item));
    } catch {
      setPropsError(true); // e.g. they just made check-ins private
    } finally {
      setBusy(false);
    }
  }

  async function onReport() {
    if (report === 'idle') return setReport('confirm');
    setReport('sending');
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
            {item.props ? `${item.props} prop${item.props === 1 ? '' : 's'}` : ' '}
          </T>
        ) : (
          <Press
            onPress={props}
            disabled={busy}
            haptic
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityState={{ selected: item.i_propped, busy }}
            accessibilityLabel={`Props, ${item.props}`}
            style={[styles.props, item.i_propped && styles.propsOn]}>
            <HandsClapping size={18} color={item.i_propped ? color.cobalt : color.ink2} weight={item.i_propped ? 'fill' : 'regular'} />
            <T v="footnote" c={item.i_propped ? 'cobalt' : 'ink2'} style={styles.bold}>
              {item.props ? `Props · ${item.props}` : 'Props'}
            </T>
          </Press>
        )}
        {!mine && (
          <Press
            onPress={onReport}
            disabled={report === 'sending' || report === 'done'}
            haptic={false}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={report === 'confirm' ? `Confirm report of ${name}’s ${what}` : `Report ${name}’s ${what}`}>
            <T v="footnote" c={report === 'confirm' ? 'danger' : 'muted'}>
              {report === 'done' ? 'Reported. Thanks.' : report === 'confirm' || report === 'sending' ? 'Tap again to report' : 'Report'}
            </T>
          </Press>
        )}
      </View>
      {propsError && (
        <T v="footnote" c="danger">
          Couldn’t give props right now.
        </T>
      )}
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

  const load = useCallback(() => {
    if (!userId) return;
    setFailed(false);
    getFeed()
      .then((fresh) =>
        setLoaded((prev) =>
          prev?.userId === userId
            ? { ...prev, items: mergeFirstPage(prev.items, fresh), now: Date.now() }
            : { userId, items: fresh, now: Date.now(), more: fresh.length === FEED_PAGE },
        ),
      )
      .catch(() => setFailed(true));
  }, [userId]);

  useFocusEffect(load);

  const current = loaded?.userId === userId ? loaded : null;

  async function loadMore() {
    if (!current || !current.more || loadingMore || !current.items.length) return;
    const cursor = current.items[current.items.length - 1].at;
    setLoadingMore(true);
    try {
      const next = await getFeed(cursor);
      // Append only if nothing reloaded underneath this request.
      setLoaded((prev) =>
        prev && prev.userId === userId && prev.items[prev.items.length - 1]?.at === cursor
          ? { ...prev, items: [...prev.items, ...next.filter((n) => !prev.items.some((i) => keyOf(i) === keyOf(n)))], more: next.length === FEED_PAGE }
          : prev,
      );
    } catch {
      // try again on the next scroll
    } finally {
      setLoadingMore(false);
    }
  }

  function onProps(key: string, on: boolean) {
    setLoaded((prev) =>
      prev && {
        ...prev,
        items: prev.items.map((i) => (keyOf(i) === key && i.i_propped !== on ? { ...i, i_propped: on, props: i.props + (on ? 1 : -1) } : i)),
      },
    );
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
          <EmptyState icon={UsersThree} title="Couldn’t load your feed" body="Check your connection and try again." action="Try again" onAction={load} />
        ) : (
          <ActivityIndicator color={color.ink} style={{ marginTop: space.huge }} />
        )
      ) : (
        <FlatList
          data={current.items}
          keyExtractor={keyOf}
          renderItem={({ item }) => <FeedCard item={item} mine={item.user_id === userId} now={current.now} userId={userId!} onProps={onProps} />}
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
              body={
                profile?.username
                  ? 'Follow friends to see their check-ins and goal hits here. Your own show up too.'
                  : 'Pick a username above, then follow friends to see their check-ins here.'
              }
              action={profile?.username ? 'Find people' : undefined}
              onAction={profile?.username ? () => router.push('/people') : undefined}
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

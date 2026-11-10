import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Bell, Fire, Handshake, LockSimple, Trophy, UserCircle } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState, ScreenHeader, ScrollScreen } from '@/components/layout';
import { displayName, FollowButton } from '@/components/People';
import { Press } from '@/components/Press';
import { T } from '@/components/Text';
import { getPublicProfile, nudge, reportUser, setBlock, setPartner, type PublicProfile } from '@/lib/api';
import { localDate, shortDate, streakLabel } from '@/lib/format';
import { formatValue, goalProgress, goalTitle } from '@/lib/goals';
import { kindOf } from '@/lib/workouts';
import { useAuth } from '@/providers/AuthProvider';
import { color, font, layout, radius, shadow, space } from '@/theme/tokens';

function Private({ what }: { what: string }) {
  return (
    <View style={styles.private}>
      <LockSimple size={18} color={color.muted} />
      <T v="callout" c="muted">
        {what} are private.
      </T>
    </View>
  );
}

function Counts({ p }: { p: PublicProfile }) {
  const open = (list: 'followers' | 'following') => router.push({ pathname: '/u/[username]/[list]', params: { username: p.username, list } });
  return (
    <View style={styles.counts}>
      <Press onPress={() => open('followers')} haptic={false} accessibilityRole="link">
        <T v="callout" c="ink2">
          <T v="callout" style={styles.bold}>
            {p.followers}
          </T>{' '}
          follower{p.followers === 1 ? '' : 's'}
        </T>
      </Press>
      <Press onPress={() => open('following')} haptic={false} accessibilityRole="link">
        <T v="callout" c="ink2">
          <T v="callout" style={styles.bold}>
            {p.following}
          </T>{' '}
          following
        </T>
      </Press>
    </View>
  );
}

// Follow, nudge, partner, block, report: everything you can do with someone else.
function Actions({ p, userId, today, onChanged }: { p: PublicProfile; userId: string; today: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [confirm, setConfirm] = useState<'block' | 'report' | null>(null);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutual = p.i_follow && p.follows_me;

  async function run(task: () => Promise<void>, reload = true) {
    setBusy(true);
    setError(null);
    try {
      await task();
      if (reload) onChanged();
    } catch {
      setError('That didn’t work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (p.i_blocked) {
    return (
      <View style={styles.actions}>
        <T v="callout" c="muted" style={styles.flex}>
          You blocked @{p.username}. You won’t see each other.
        </T>
        <Button label="Unblock" variant="outline" size="s" loading={busy} onPress={() => run(() => setBlock(p.id, false))} />
      </View>
    );
  }

  return (
    <View style={styles.actionsBlock}>
      <View style={styles.actions}>
        <FollowButton userId={p.id} following={p.i_follow} onChange={onChanged} />
        {mutual && (
          <Button
            label={nudged ? 'Nudged' : 'Nudge'}
            variant="outline"
            size="s"
            icon={Bell}
            disabled={nudged || busy}
            onPress={() => run(async () => { await nudge(p.id, today); setNudged(true); }, false)}
          />
        )}
        {mutual && p.partner_status !== 'partners' && (
          <Button
            label={p.partner_status === 'requested' ? 'Request sent' : p.partner_status === 'incoming' ? 'Accept partner' : 'Ask to partner'}
            variant={p.partner_status === 'incoming' ? 'dark' : 'outline'}
            size="s"
            icon={Handshake}
            disabled={p.partner_status === 'requested' || busy}
            onPress={() => run(() => setPartner(p.id, p.partner_status === 'incoming' ? 'accept' : 'ask'))}
          />
        )}
      </View>
      {p.partner_status === 'partners' && (
        <View style={styles.actions}>
          <Handshake size={18} color={color.ink} weight="fill" />
          <T v="callout" c="ink2" style={styles.flex}>
            Accountability partners
          </T>
          <Press onPress={() => run(() => setPartner(p.id, 'end'))} haptic={false} accessibilityRole="button">
            <T v="footnote" c="muted" style={styles.bold}>
              End
            </T>
          </Press>
        </View>
      )}
      <View style={styles.actions}>
        <Press
          onPress={() => (confirm === 'block' ? run(() => setBlock(p.id, true)) : setConfirm('block'))}
          disabled={busy}
          haptic={false}
          accessibilityRole="button">
          <T v="footnote" c={confirm === 'block' ? 'danger' : 'muted'} style={styles.bold}>
            {confirm === 'block' ? 'Tap again to block' : 'Block'}
          </T>
        </Press>
        <Press
          onPress={() => (confirm === 'report' ? run(async () => { await reportUser(userId, p.id); setReported(true); }, false) : setConfirm('report'))}
          disabled={busy || reported}
          haptic={false}
          accessibilityRole="button">
          <T v="footnote" c={confirm === 'report' && !reported ? 'danger' : 'muted'} style={styles.bold}>
            {reported ? 'Reported. Thanks.' : confirm === 'report' ? 'Tap again to report' : 'Report'}
          </T>
        </Press>
      </View>
      {error && (
        <T v="footnote" c="danger">
          {error}
        </T>
      )}
    </View>
  );
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { ready, session } = useAuth();
  const userId = session?.user.id ?? null;
  const [today] = useState(() => localDate());
  const key = `${username}:${userId}`;
  const [loaded, setLoaded] = useState<{ key: string; profile: PublicProfile | null; failed: boolean } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!userId) return;
    getPublicProfile(username, today)
      .then((profile) => setLoaded({ key, profile, failed: false }))
      .catch(() => setLoaded({ key, profile: null, failed: true }));
  }, [username, userId, key, today, version]);

  if (ready && !session) return <Redirect href={{ pathname: '/login', params: { next: `/u/${username}` } }} />;
  const current = loaded?.key === key ? loaded : null;
  const p = current?.profile ?? null;

  return (
    <View style={styles.root}>
      <ScreenHeader title={`@${username}`} width={layout.form} />
      {!current || !userId ? (
        <ActivityIndicator color={color.ink} style={{ marginTop: space.huge }} />
      ) : !p ? (
        <EmptyState
          icon={UserCircle}
          title={current.failed ? 'Couldn’t load this profile' : 'No one here'}
          body={current.failed ? 'Check your connection and try again.' : 'This username doesn’t exist, or isn’t available to you.'}
          action={current.failed ? 'Try again' : undefined}
          onAction={current.failed ? () => setVersion((v) => v + 1) : undefined}
        />
      ) : (
        <ScrollScreen width={layout.form} gap={space.xxl}>
          <View style={[styles.card, shadow.card]}>
            <View style={styles.head}>
              <Avatar url={p.avatar_url} name={displayName(p)} size={72} />
              <View style={styles.flex}>
                <T v="title2">{displayName(p)}</T>
                <T v="callout" c="muted">
                  @{p.username}
                  {p.follows_me && !p.is_me ? ' · follows you' : ''}
                </T>
              </View>
            </View>
            {p.bio ? (
              <T v="body" c="ink2">
                {p.bio}
              </T>
            ) : null}
            <Counts p={p} />
            {p.is_me ? (
              <Button label="Edit profile" variant="outline" size="s" onPress={() => router.navigate('/profile')} style={styles.left} />
            ) : (
              <Actions p={p} userId={userId} today={today} onChanged={() => setVersion((v) => v + 1)} />
            )}
          </View>

          {!p.i_blocked && (
            <>
              <View style={styles.block}>
                <T v="title3">Check-ins</T>
                {p.streak == null ? (
                  <Private what="Check-ins" />
                ) : (
                  <View style={[styles.card, shadow.card]}>
                    <View style={styles.row}>
                      <Fire size={18} color={p.streak ? color.ink : color.muted} weight={p.streak ? 'fill' : 'regular'} />
                      <T v="headline">{p.streak ? streakLabel(p.streak) : 'No current streak'}</T>
                    </View>
                    {(p.workouts ?? []).length === 0 ? (
                      <T v="callout" c="muted">
                        Nothing logged yet.
                      </T>
                    ) : (
                      (p.workouts ?? []).map((w) => {
                        const k = kindOf(w.kind);
                        return (
                          <View key={w.id} style={styles.row}>
                            <View style={styles.icon}>
                              <k.icon size={18} color={color.ink} weight="bold" />
                            </View>
                            <View style={styles.flex}>
                              <T v="bodyStrong">
                                {k.past}
                                {w.gym_name ? ` at ${w.gym_name}` : ''}
                              </T>
                              {w.note ? (
                                <T v="footnote" c="ink2">
                                  {w.note}
                                </T>
                              ) : null}
                            </View>
                            <T v="footnote" c="muted">
                              {shortDate(w.logged_on)}
                            </T>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>

              <View style={styles.block}>
                <T v="title3">Goals</T>
                {p.goals == null ? (
                  <Private what="Goals" />
                ) : p.goals.length === 0 ? (
                  <T v="callout" c="muted">
                    No goals yet.
                  </T>
                ) : (
                  <View style={[styles.card, shadow.card]}>
                    {p.goals.map((g) => {
                      const { pct } = goalProgress(g, [{ value: g.current, logged_on: '', created_at: '' }]);
                      return (
                        <View key={g.id} style={styles.goal}>
                          <View style={styles.row}>
                            {g.achieved_at && <Trophy size={16} color={color.ink} weight="fill" />}
                            <T v="headline" style={styles.flex}>
                              {goalTitle(g)}
                            </T>
                            <T v="footnote" c="muted">
                              {g.achieved_at ? `Hit ${shortDate(g.achieved_at)}` : formatValue(g.current, g.unit)}
                            </T>
                          </View>
                          {!g.achieved_at && (
                            <View style={styles.track}>
                              <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} />
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollScreen>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  flex: { flex: 1 },
  bold: { fontFamily: font.bold },
  left: { alignSelf: 'flex-start' },
  card: { backgroundColor: color.card, borderRadius: radius.l, padding: space.l, gap: space.m },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.l },
  counts: { flexDirection: 'row', gap: space.xl },
  actionsBlock: { gap: space.m },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.m },
  block: { gap: space.m },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  icon: { width: 34, height: 34, borderRadius: radius.m, backgroundColor: color.sunken, alignItems: 'center', justifyContent: 'center' },
  private: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  goal: { gap: space.s },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: color.sunken, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: color.ink },
});

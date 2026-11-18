import { router } from 'expo-router';
import { UserCheck, UserPlus } from 'phosphor-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { setFollow, type Person } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { color, radius, shadow, space } from '@/theme/tokens';

import { Avatar } from './Avatar';
import { Button } from './Button';
import { Press } from './Press';
import { T } from './Text';

export const displayName = (p: { display_name: string | null; username: string | null }) =>
  p.display_name?.trim() || (p.username ? `@${p.username}` : 'DropSet member');

// Your own posts can come before you have a username; those open your Profile instead.
export function openProfile(username: string | null) {
  if (username) router.push({ pathname: '/u/[username]', params: { username } });
  else router.navigate('/profile');
}

// Follow / Following toggle. Keeps its own state so lists don't need to reload.
// Following needs a username of your own, so without one it sends you to Profile to pick it.
export function FollowButton({ userId, following: initial, onChange }: { userId: string; following: boolean; onChange?: (following: boolean) => void }) {
  const { profile } = useAuth();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    if (!profile?.username) return router.navigate('/profile');
    setBusy(true);
    setFailed(false);
    try {
      await setFollow(userId, !following);
      setFollowing(!following);
      onChange?.(!following);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      label={failed ? 'Try again' : following ? 'Following' : 'Follow'}
      variant={following ? 'outline' : 'dark'}
      size="s"
      icon={following ? UserCheck : UserPlus}
      onPress={toggle}
      loading={busy}
    />
  );
}

export function PersonRow({ person, showFollow = true }: { person: Person; showFollow?: boolean }) {
  return (
    <View style={[styles.row, shadow.card]}>
      <Press onPress={() => openProfile(person.username)} haptic={false} scaleTo={0.99} accessibilityRole="link" style={styles.who}>
        <Avatar url={person.avatar_url} name={displayName(person)} size={44} />
        <View style={styles.flex}>
          <T v="headline" numberOfLines={1}>
            {displayName(person)}
          </T>
          <T v="footnote" c="muted" numberOfLines={1}>
            @{person.username}
          </T>
        </View>
      </Press>
      {showFollow && <FollowButton userId={person.id} following={person.i_follow} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.l, backgroundColor: color.card },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.m },
});

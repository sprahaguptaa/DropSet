import { Redirect, useLocalSearchParams } from 'expo-router';
import { UsersThree } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EmptyState, ScreenHeader, ScrollScreen } from '@/components/layout';
import { PersonRow } from '@/components/People';
import { getFollowList, type Person } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { color, layout, space } from '@/theme/tokens';

// Followers or following of someone (/u/sage/followers, /u/sage/following).
export default function FollowList() {
  const { username, list } = useLocalSearchParams<{ username: string; list: string }>();
  const followers = list !== 'following';
  const { ready, session } = useAuth();
  const userId = session?.user.id ?? null;
  const key = `${username}:${followers}:${userId}`;
  const [loaded, setLoaded] = useState<{ key: string; people: Person[] | null } | null>(null);

  useEffect(() => {
    if (!userId) return;
    getFollowList(username, followers)
      .then((people) => setLoaded({ key, people }))
      .catch(() => setLoaded({ key, people: null }));
  }, [username, followers, userId, key]);

  if (ready && !session) return <Redirect href={{ pathname: '/login', params: { next: `/u/${username}/${list}` } }} />;
  const current = loaded?.key === key ? loaded : null;

  return (
    <View style={styles.root}>
      <ScreenHeader title={followers ? 'Followers' : 'Following'} subtitle={`@${username}`} width={layout.form} />
      {!current ? (
        <ActivityIndicator color={color.ink} style={{ marginTop: space.huge }} />
      ) : !current.people ? (
        <EmptyState icon={UsersThree} title="Couldn’t load this list" body="Check your connection and try again." />
      ) : current.people.length === 0 ? (
        <EmptyState icon={UsersThree} title={followers ? 'No followers yet' : 'Not following anyone yet'} body="People show up here once they connect." />
      ) : (
        <ScrollScreen width={layout.form} gap={space.m}>
          {current.people.map((p) => (
            <PersonRow key={p.id} person={p} showFollow={p.id !== userId} />
          ))}
        </ScrollScreen>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
});

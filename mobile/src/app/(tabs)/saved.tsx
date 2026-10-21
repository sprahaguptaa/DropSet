import { router, useFocusEffect } from 'expo-router';
import { HeartStraight, SignIn } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { GymCard, GymCardSkeleton } from '@/components/GymCard';
import { EmptyState, useWide } from '@/components/layout';
import { TabBody, TabTitle } from '@/components/TabScreen';
import { getSavedGyms, type GymResult } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useSaved } from '@/providers/SavedProvider';
import { layout, space } from '@/theme/tokens';

export default function Saved() {
  const { session } = useAuth();
  const { isSaved } = useSaved();
  const wide = useWide();
  const [loaded, setLoaded] = useState<GymResult[] | null>(null);
  // Un-hearting a gym here removes it right away; the list refetches whenever the tab gains focus.
  const gyms = loaded?.filter((g) => isSaved(g.gym_id)) ?? null;

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      getSavedGyms()
        .then(setLoaded)
        .catch(() => setLoaded([]));
    }, [session]),
  );

  return (
    <TabBody>
      <TabTitle width={layout.list} title="Saved" subtitle={session ? 'Gyms you want to try on your next trip.' : undefined} />
      {!session ? (
        <EmptyState
          icon={SignIn}
          title="Keep a shortlist"
          body="Log in to save gyms and find them again on any device."
          action="Log in"
          onAction={() => router.push('/login')}
        />
      ) : gyms == null ? (
        <View style={styles.list}>
          <GymCardSkeleton wide={wide} />
          <GymCardSkeleton wide={wide} />
        </View>
      ) : (
        <FlatList
          data={gyms}
          keyExtractor={(g) => g.gym_id}
          renderItem={({ item }) => <GymCard gym={item} wide={wide} />}
          ItemSeparatorComponent={() => <View style={{ height: space.m }} />}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
          ListEmptyComponent={
            <EmptyState
              icon={HeartStraight}
              title="Nothing saved yet"
              body="Tap the heart on any gym to keep it here."
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
  list: { gap: space.m, paddingHorizontal: layout.gutter, width: '100%', maxWidth: layout.list, alignSelf: 'center' },
});

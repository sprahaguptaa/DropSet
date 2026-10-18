import { router } from 'expo-router';
import { MapPinLine, SignIn, SignOut, User } from 'phosphor-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState, ScrollScreen } from '@/components/layout';
import { Mark } from '@/components/Logo';
import { TabTitle } from '@/components/TabScreen';
import { T } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { updateProfile } from '@/lib/api';
import { firstName, useAuth } from '@/providers/AuthProvider';
import { color, radius, shadow, space } from '@/theme/tokens';

function About() {
  return (
    <View style={styles.about}>
      <Mark size={28} />
      <T v="footnote" c="muted" style={styles.aboutText}>
        DropSet · CIS 440 capstone prototype.{'\n'}Gym locations © OpenStreetMap contributors. Photos from Unsplash.
      </T>
    </View>
  );
}

// Starts from the saved profile; remounted (via key) whenever the saved profile changes.
function DetailsForm() {
  const auth = useAuth();
  const { session, profile } = auth;
  const [name, setName] = useState(profile?.display_name ?? '');
  const [city, setCity] = useState(profile?.home_city ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = name !== (profile?.display_name ?? '') || city !== (profile?.home_city ?? '');

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await updateProfile(session!.user.id, { display_name: name.trim(), home_city: city.trim() || null });
      await auth.refreshProfile();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <View style={styles.form}>
      <T v="title3">Your details</T>
      <TextField label="Name" icon={User} value={name} onChangeText={setName} autoComplete="name" />
      <TextField label="Home city" icon={MapPinLine} value={city} onChangeText={setCity} placeholder="Where you usually train" />
      {error && (
        <T v="footnote" c="danger">
          {error}
        </T>
      )}
      <Button label={dirty ? 'Save changes' : 'Saved'} variant="dark" onPress={save} loading={busy} disabled={!dirty} />
    </View>
  );
}

export default function Profile() {
  const auth = useAuth();
  const { session, profile } = auth;

  if (!session) {
    return (
      <View style={styles.root}>
        <TabTitle title="Profile" />
        <EmptyState
          icon={SignIn}
          title="Make it yours"
          body="Create an account to save gyms, buy passes and keep your pass history."
          action="Log in or sign up"
          onAction={() => router.push('/login')}
        />
        <About />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TabTitle title="Profile" />
      <ScrollScreen contentContainerStyle={styles.content}>
        <View style={[styles.identity, shadow.card]}>
          <View style={styles.avatar}>
            <T v="title2" c="onDark">
              {(firstName(auth)[0] ?? 'D').toUpperCase()}
            </T>
          </View>
          <View style={styles.flex}>
            <T v="title3">{profile?.display_name || firstName(auth)}</T>
            <T v="callout" c="muted" numberOfLines={1}>
              {session.user.email}
            </T>
          </View>
        </View>

        <DetailsForm key={profile?.updated_at ?? 'loading'} />

        <Button label="Log out" variant="outline" icon={SignOut} onPress={auth.signOut} />
        <About />
      </ScrollScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  flex: { flex: 1 },
  content: { gap: space.xxl, maxWidth: 560 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.l, padding: space.l, borderRadius: radius.l, backgroundColor: color.card },
  avatar: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' },
  form: { gap: space.l },
  about: { alignItems: 'center', gap: space.s, paddingVertical: space.xxl },
  aboutText: { textAlign: 'center' },
});

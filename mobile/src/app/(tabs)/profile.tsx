import { router } from 'expo-router';
import { Camera, CaretRight, MapPinLine, SignIn, SignOut, Storefront, User } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState, ScrollScreen } from '@/components/layout';
import { Mark } from '@/components/Logo';
import { Press } from '@/components/Press';
import { TabTitle } from '@/components/TabScreen';
import { T } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { removeAvatar, updateProfile, uploadAvatar } from '@/lib/api';
import { pickAvatar } from '@/lib/photo-picker';
import { useStaffGyms } from '@/lib/use-staff-gyms';
import { firstName, useAuth } from '@/providers/AuthProvider';
import { color, font, layout, radius, shadow, space } from '@/theme/tokens';

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

// Photo, name and email. Tapping the photo (or "Add a photo") opens the picker.
function IdentityCard() {
  const auth = useAuth();
  const { session, profile } = auth;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = profile?.display_name || firstName(auth);
  const hasPhoto = !!profile?.avatar_url;

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      await auth.refreshProfile();
    } catch (e) {
      setError((e as Error).message || 'That didn’t work. Try another photo.');
    } finally {
      setBusy(false);
    }
  }

  const change = () =>
    run(async () => {
      const uri = await pickAvatar();
      if (uri) await uploadAvatar(session!.user.id, uri);
    });
  const remove = () => run(() => removeAvatar(session!.user.id));

  return (
    <View style={[styles.identity, shadow.card]}>
      <Press onPress={change} disabled={busy} scaleTo={0.95} accessibilityRole="button" accessibilityLabel={hasPhoto ? 'Change profile photo' : 'Add a profile photo'}>
        <Avatar url={profile?.avatar_url} name={name} size={72} />
        <View style={styles.badge}>
          {busy ? <ActivityIndicator size="small" color={color.ink} /> : <Camera size={15} color={color.ink} weight="bold" />}
        </View>
      </Press>
      <View style={styles.flex}>
        <T v="title3" numberOfLines={1}>
          {name}
        </T>
        <T v="callout" c="muted" numberOfLines={1}>
          {session?.user.email}
        </T>
        <View style={styles.photoLinks}>
          <Press onPress={change} disabled={busy} haptic={false} accessibilityRole="button">
            <T v="footnote" c="cobalt" style={styles.link}>
              {hasPhoto ? 'Change photo' : 'Add a photo'}
            </T>
          </Press>
          {hasPhoto && (
            <Press onPress={remove} disabled={busy} haptic={false} accessibilityRole="button">
              <T v="footnote" c="muted" style={styles.link}>
                Remove
              </T>
            </Press>
          )}
        </View>
        {error && (
          <T v="footnote" c="danger">
            {error}
          </T>
        )}
      </View>
    </View>
  );
}

// Only for accounts linked to a gym in gym_staff.
function DeskLink() {
  const gyms = useStaffGyms();
  if (!gyms?.length) return null;
  return (
    <Press onPress={() => router.push('/desk')} scaleTo={0.985} accessibilityRole="link" style={[styles.desk, shadow.card]}>
      <Storefront size={24} color={color.ink} />
      <View style={styles.flex}>
        <T v="headline">Front desk</T>
        <T v="footnote" c="muted" numberOfLines={1}>
          Check in passes at {gyms.length === 1 ? gyms[0].name : `${gyms.length} gyms`}
        </T>
      </View>
      <CaretRight size={18} color={color.muted} />
    </Press>
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
        <TabTitle title="Profile" width={layout.form} />
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
      <TabTitle title="Profile" width={layout.form} />
      <ScrollScreen width={layout.form} gap={space.xxl}>
        <IdentityCard />
        <DeskLink />

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
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.l, padding: space.l, borderRadius: radius.l, backgroundColor: color.card },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: color.card,
    borderWidth: 2,
    borderColor: color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desk: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, borderRadius: radius.l, backgroundColor: color.card },
  photoLinks: { flexDirection: 'row', gap: space.l, marginTop: 6 },
  link: { fontFamily: font.bold },
  form: { gap: space.l },
  about: { alignItems: 'center', gap: space.s, paddingVertical: space.xxl },
  aboutText: { textAlign: 'center' },
});

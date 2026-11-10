import { router, useFocusEffect } from 'expo-router';
import { Bell, Handshake, MagnifyingGlass, ShareNetwork, X } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import {
  getPartners,
  getPublicProfile,
  nudge,
  setPartner,
  takeNudges,
  updateProfile,
  USERNAME_RE,
  type Nudge,
  type Partner,
} from '@/lib/api';
import { localDate, streakLabel } from '@/lib/format';
import { shareProfile } from '@/lib/share';
import { useAuth } from '@/providers/AuthProvider';
import { color, font, radius, shadow, space } from '@/theme/tokens';

import { Avatar } from './Avatar';
import { Button } from './Button';
import { displayName, openProfile } from './People';
import { Press } from './Press';
import { T } from './Text';
import { TextField } from './TextField';

const isTaken = (e: unknown) => /duplicate|unique|23505/i.test((e as Error)?.message ?? '');

// Asked before anything social: a username is how people find and follow you.
export function UsernameCard() {
  const auth = useAuth();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = value.trim().toLowerCase();
  const valid = USERNAME_RE.test(name);
  if (!auth.session || !auth.profile || auth.profile.username) return null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await updateProfile(auth.session!.user.id, { username: name });
      await auth.refreshProfile();
    } catch (e) {
      setError(isTaken(e) ? 'That username is taken. Try another.' : 'Couldn’t save. Try again.');
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, shadow.card]}>
      <T v="title3">Pick a username</T>
      <T v="callout" c="muted">
        It’s how friends find and follow you. Letters, numbers and _ only.
      </T>
      <TextField
        label="Username"
        value={value}
        onChangeText={setValue}
        placeholder="e.g. sage_lifts"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        error={value && !valid ? '3 to 20 characters: a-z, 0-9 and _' : error}
        onSubmitEditing={() => valid && save()}
      />
      <Button label="Save username" variant="dark" size="m" onPress={save} loading={busy} disabled={!valid} />
    </View>
  );
}

function Toggle({ label, hint, value, onChange, disabled }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <T v="bodyStrong">{label}</T>
        <T v="footnote" c="muted">
          {hint}
        </T>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: color.cobalt, false: color.line }}
        thumbColor={color.card}
        accessibilityLabel={label}
      />
    </View>
  );
}

// Own profile: public header info (counts, share link, bio) and the privacy toggles.
export function PublicProfileSettings() {
  const auth = useAuth();
  const { session, profile } = auth;
  const username = profile?.username ?? null;
  const [counts, setCounts] = useState<{ username: string; followers: number; following: number } | null>(null);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!username) return;
      getPublicProfile(username, localDate())
        .then((p) => p && setCounts({ username, followers: p.followers, following: p.following }))
        .catch(() => {});
    }, [username]),
  );

  if (!session || !profile || !username) return null;
  const shown = counts?.username === username ? counts : null;

  async function update(patch: Parameters<typeof updateProfile>[1]) {
    setBusy(true);
    setNote(null);
    try {
      await updateProfile(session!.user.id, patch);
      await auth.refreshProfile();
    } catch {
      setNote('Couldn’t save that. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    try {
      const how = await shareProfile(username!);
      setNote(how === 'copied' ? 'Profile link copied.' : null);
    } catch {
      // share sheet dismissed
    }
  }

  return (
    <View style={styles.block}>
      <T v="title3">Public profile</T>
      <View style={[styles.card, shadow.card]}>
        <View style={styles.headRow}>
          <Press onPress={() => openProfile(username)} haptic={false} accessibilityRole="link" style={styles.flex}>
            <T v="headline">@{username}</T>
            <T v="footnote" c="muted">
              {shown ? `${shown.followers} follower${shown.followers === 1 ? '' : 's'} · ${shown.following} following` : 'See your public profile'}
            </T>
          </Press>
          <Button label="Share" variant="outline" size="s" icon={ShareNetwork} onPress={share} />
        </View>
        <Button label="Find people" variant="ghost" size="s" icon={MagnifyingGlass} onPress={() => router.push('/people')} style={styles.left} />
        <TextField label="Bio" value={bio} onChangeText={setBio} placeholder="What you train, where you’re headed" maxLength={160} />
        {bio.trim() !== (profile.bio ?? '') && (
          <Button label="Save bio" variant="dark" size="s" onPress={() => update({ bio: bio.trim() || null })} loading={busy} style={styles.left} />
        )}
      </View>
      <View style={[styles.card, shadow.card]}>
        <Toggle
          label="Show my check-ins"
          hint="Your daily log and streak, on your profile and in followers’ feeds."
          value={profile.show_checkins}
          onChange={(v) => update({ show_checkins: v })}
          disabled={busy}
        />
        <Toggle
          label="Show which gym I’m at"
          hint="Off by default. When on, check-ins include the gym name."
          value={profile.share_gym}
          onChange={(v) => update({ share_gym: v })}
          disabled={busy}
        />
        <Toggle
          label="Show my goals"
          hint="Your goals, progress and goal hits."
          value={profile.show_goals}
          onChange={(v) => update({ show_goals: v })}
          disabled={busy}
        />
      </View>
      {note && (
        <T v="footnote" c={note.startsWith('Couldn') ? 'danger' : 'muted'}>
          {note}
        </T>
      )}
    </View>
  );
}

// Accountability partners: mutual, opt-in, and the only people who see a missed day.
export function PartnersCard() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [loaded, setLoaded] = useState<{ userId: string; partners: Partner[]; today: string } | null>(null);
  const [nudged, setNudged] = useState<string[]>([]);
  const load = useCallback(() => {
    if (!userId) return;
    const today = localDate();
    getPartners(today)
      .then((partners) => setLoaded({ userId, partners, today }))
      .catch(() => {});
  }, [userId]);

  useFocusEffect(load);

  const current = loaded?.userId === userId ? loaded : null;
  if (!current) return null;
  const act = (id: string, action: 'accept' | 'end') => setPartner(id, action).then(load).catch(() => {});

  return (
    <View style={styles.block}>
      <T v="title3">Accountability partners</T>
      <View style={[styles.card, shadow.card]}>
        {current.partners.length === 0 ? (
          <View style={styles.headRow}>
            <Handshake size={22} color={color.ink} />
            <T v="callout" c="muted" style={styles.flex}>
              Partners keep each other honest: only they see a missed day. Ask from the profile of someone you both follow.
            </T>
          </View>
        ) : (
          current.partners.map((p) => (
            <View key={p.id} style={styles.partner}>
              <Press onPress={() => openProfile(p.username)} haptic={false} accessibilityRole="link" style={styles.who}>
                <Avatar url={p.avatar_url} name={displayName(p)} size={40} />
                <View style={styles.flex}>
                  <T v="headline" numberOfLines={1}>
                    {displayName(p)}
                  </T>
                  <T v="footnote" c={p.status === 'partners' && p.missed_yesterday && !p.logged_today ? 'ink2' : 'muted'}>
                    {p.status === 'incoming'
                      ? 'Wants to be your partner'
                      : p.status === 'requested'
                        ? 'Request sent'
                        : p.logged_today
                          ? `Logged today · ${streakLabel(p.streak ?? 0)}`
                          : p.missed_yesterday
                            ? 'Missed yesterday. A nudge might help.'
                            : `Not logged yet today · ${streakLabel(p.streak ?? 0)}`}
                  </T>
                </View>
              </Press>
              {p.status === 'incoming' ? (
                <View style={styles.actions}>
                  <Button label="Accept" variant="dark" size="s" onPress={() => act(p.id, 'accept')} />
                  <Press onPress={() => act(p.id, 'end')} hitSlop={8} haptic={false} accessibilityRole="button" accessibilityLabel="Decline">
                    <X size={16} color={color.muted} weight="bold" />
                  </Press>
                </View>
              ) : p.status === 'partners' && !p.logged_today ? (
                <Button
                  label={nudged.includes(p.id) ? 'Nudged' : 'Nudge'}
                  variant="outline"
                  size="s"
                  icon={Bell}
                  disabled={nudged.includes(p.id)}
                  onPress={() => nudge(p.id, current.today).then(() => setNudged((n) => [...n, p.id])).catch(() => {})}
                />
              ) : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

// "Matt nudged you": shown once, wherever it's first seen (Explore or Feed).
export function NudgeBanner() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [loaded, setLoaded] = useState<{ userId: string; nudges: Nudge[] } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      takeNudges()
        .then((n) => n.length && setLoaded((prev) => ({ userId, nudges: [...n, ...(prev?.userId === userId ? prev.nudges : [])] })))
        .catch(() => {});
    }, [userId]),
  );

  const nudges = loaded?.userId === userId ? loaded.nudges : [];
  if (!nudges.length) return null;
  const first = nudges[0];
  const others = nudges.length - 1;

  return (
    <View style={[styles.nudge, shadow.card]} accessibilityLiveRegion="polite">
      <Avatar url={first.from_avatar} name={first.from_name} size={40} />
      <View style={styles.flex}>
        <T v="headline" c="onDark">
          {first.from_name}
          {others ? ` and ${others} other${others === 1 ? '' : 's'}` : ''} nudged you
        </T>
        <T v="callout" c="onDarkMuted">
          Get a session in today?
        </T>
      </View>
      <Button label="Log today" variant="light" size="s" onPress={() => router.push('/log')} />
      <Press onPress={() => setLoaded(null)} hitSlop={10} haptic={false} accessibilityRole="button" accessibilityLabel="Dismiss">
        <X size={16} color={color.onDark} weight="bold" />
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { gap: space.m },
  card: { backgroundColor: color.card, borderRadius: radius.l, padding: space.l, gap: space.m },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  left: { alignSelf: 'flex-start' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.xs },
  partner: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.m },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, borderRadius: radius.l, backgroundColor: color.ink },
  bold: { fontFamily: font.bold },
});

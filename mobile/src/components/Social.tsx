import { router, useFocusEffect } from 'expo-router';
import { Bell, Handshake, MagnifyingGlass, ShareNetwork, X } from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';

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

// react-native-web colors an "on" switch's thumb teal unless told otherwise (mint/teal is reserved for active passes).
const WEB_SWITCH: object = Platform.OS === 'web' ? { activeThumbColor: color.card } : {};

const isTaken = (e: unknown) => /duplicate|unique|23505/i.test((e as Error)?.message ?? '');

// Asked before anything social: a username is how people find and follow you.
export function UsernameCard() {
  const auth = useAuth();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const name = value.trim().toLowerCase();
  const valid = USERNAME_RE.test(name);
  // Don't flag the format while someone is still typing their first letters.
  const formatError = value && !valid && (tried || name.length >= 3) ? '3 to 20 characters: a-z, 0-9 and _' : null;
  if (!auth.session || !auth.profile || auth.profile.username) return null;

  async function save() {
    setTried(true);
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await updateProfile(auth.session!.user.id, { username: name });
    } catch (e) {
      setError(isTaken(e) ? 'That username is taken. Try another.' : 'Couldn’t save. Try again.');
      setBusy(false);
      return;
    }
    try {
      await auth.refreshProfile(); // saved; this only swaps the card out
    } catch {
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
        onChangeText={(t) => {
          setValue(t);
          setError(null);
        }}
        placeholder="e.g. sage_lifts"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        error={formatError ?? error}
        onSubmitEditing={save}
      />
      <Button label="Save username" variant="dark" size="m" onPress={save} loading={busy} disabled={!valid} />
    </View>
  );
}

// Flips at once, saves in the background, and flips back if the save fails.
function Toggle({ label, hint, value, onSave }: { label: string; hint: string; value: boolean; onSave: (v: boolean) => Promise<boolean> }) {
  const [pending, setPending] = useState<boolean | null>(null);
  const shown = pending ?? value;

  async function change(v: boolean) {
    setPending(v);
    await onSave(v);
    setPending(null); // saved: the profile now says v; failed: back to the saved value
  }

  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <T v="bodyStrong">{label}</T>
        <T v="footnote" c="muted">
          {hint}
        </T>
      </View>
      <Switch
        value={shown}
        onValueChange={change}
        disabled={pending != null}
        trackColor={{ true: color.cobalt, false: color.line }}
        thumbColor={color.card}
        {...WEB_SWITCH}
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

  // Returns whether it saved (the switches roll back when it didn't).
  async function update(patch: Parameters<typeof updateProfile>[1]) {
    setNote(null);
    try {
      await updateProfile(session!.user.id, patch);
    } catch {
      setNote('Couldn’t save that. Try again.');
      return false;
    }
    await auth.refreshProfile().catch(() => {});
    return true;
  }

  async function saveBio() {
    setBusy(true);
    await update({ bio: bio.trim() || null });
    setBusy(false);
  }

  async function share() {
    setNote(null);
    try {
      const how = await shareProfile(username!);
      if (how === 'copied') setNote('Profile link copied.');
    } catch {
      setNote('Couldn’t share the link. Your profile is at /u/' + username + '.');
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
          <Button label="Save bio" variant="dark" size="s" onPress={saveBio} loading={busy} style={styles.left} />
        )}
      </View>
      <View style={[styles.card, shadow.card]}>
        <Toggle
          label="Show my check-ins"
          hint="Your daily log and streak, on your profile and in followers’ feeds."
          value={profile.show_checkins}
          onSave={(v) => update({ show_checkins: v })}
        />
        <Toggle
          label="Show which gym I’m at"
          hint="Off by default. When on, check-ins include the gym name."
          value={profile.share_gym}
          onSave={(v) => update({ share_gym: v })}
        />
        <Toggle
          label="Show my goals"
          hint="Your goals, progress and goal hits."
          value={profile.show_goals}
          onSave={(v) => update({ show_goals: v })}
        />
      </View>
      {note && (
        <T v="footnote" c={note.startsWith('Couldn') ? 'danger' : 'muted'} accessibilityLiveRegion="polite">
          {note}
        </T>
      )}
    </View>
  );
}

function partnerLine(p: Partner) {
  if (p.status === 'incoming') return 'Wants to be your partner';
  if (p.status === 'requested') return 'Request sent';
  const streak = p.streak != null ? ` · ${streakLabel(p.streak)}` : ''; // null when they hide check-ins
  if (p.logged_today) return `Logged today${streak}`;
  if (p.missed_yesterday) return 'Missed yesterday. A nudge might help.';
  return `Not logged yet today${streak}`;
}

function PartnerRow({ p, today, onChanged }: { p: Partner; today: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(task: () => Promise<void>, failText: string) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch {
      setError(failText);
    } finally {
      setBusy(false);
    }
  }
  const act = (action: 'accept' | 'end') => run(async () => { await setPartner(p.id, action); onChanged(); }, 'That didn’t work. Try again.');

  return (
    <View style={styles.partnerWrap}>
      <View style={styles.partner}>
        <Press onPress={() => openProfile(p.username)} haptic={false} accessibilityRole="link" style={styles.who}>
          <Avatar url={p.avatar_url} name={displayName(p)} size={40} />
          <View style={styles.flex}>
            <T v="headline" numberOfLines={1}>
              {displayName(p)}
            </T>
            <T v="footnote" c={p.status === 'partners' && p.missed_yesterday && !p.logged_today ? 'ink2' : 'muted'}>
              {partnerLine(p)}
            </T>
          </View>
        </Press>
        {p.status === 'incoming' ? (
          <View style={styles.actions}>
            <Button label="Accept" variant="dark" size="s" disabled={busy} onPress={() => act('accept')} />
            <Press onPress={() => act('end')} disabled={busy} hitSlop={10} haptic={false} accessibilityRole="button" accessibilityLabel="Decline">
              <X size={16} color={color.muted} weight="bold" />
            </Press>
          </View>
        ) : p.status === 'requested' ? (
          <Button label="Cancel" variant="ghost" size="s" disabled={busy} onPress={() => act('end')} />
        ) : !p.logged_today ? (
          <Button
            label={nudged ? 'Nudged' : 'Nudge'}
            variant="outline"
            size="s"
            icon={Bell}
            disabled={nudged || busy}
            onPress={() => run(async () => { await nudge(p.id, today); setNudged(true); }, 'Nudges need you to follow each other.')}
          />
        ) : null}
      </View>
      {error && (
        <T v="footnote" c="danger">
          {error}
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
          current.partners.map((p) => <PartnerRow key={`${p.id}:${p.status}`} p={p} today={current.today} onChanged={load} />)
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
        // One entry per person (newest first): three nudges from Matt are still just Matt.
        .then((n) =>
          n.length &&
          setLoaded((prev) => {
            const all = [...n, ...(prev?.userId === userId ? prev.nudges : [])];
            return { userId, nudges: all.filter((x, i) => all.findIndex((y) => y.from_username === x.from_username) === i) };
          }),
        )
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
  partnerWrap: { gap: space.xs },
  partner: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.m },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, borderRadius: radius.l, backgroundColor: color.ink },
  bold: { fontFamily: font.bold },
});

import { router } from 'expo-router';
import { ArrowSquareOut, ChatCircleText } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, TextInput, View } from 'react-native';

import { deleteReview, getReviews, REVIEW_MAX_WORDS, reportReview, saveReview, type Review, type ReviewSummary } from '@/lib/api';
import { shortDate, wordCount } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import { color, font, radius, shadow, space } from '@/theme/tokens';

import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Button } from './Button';
import { DumbbellPicker, DumbbellRating } from './Dumbbells';
import { Mark } from './Logo';
import { Press } from './Press';
import { T } from './Text';

type Loaded = { key: string; reviews: Review[]; summary: ReviewSummary };

// Reviews for one gym. Tagged with gym + user so a stale list never shows after navigating or signing in.
export function useReviews(gymId: string | null) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const key = `${gymId}:${userId}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!gymId) return;
    getReviews(gymId)
      .then((r) => setLoaded({ key, ...r }))
      .catch(() => setLoaded({ key, reviews: [], summary: { average: null, count: 0 } }));
  }, [gymId, key, version]);

  const current = loaded?.key === key ? loaded : null;
  return { reviews: current?.reviews ?? null, summary: current?.summary ?? null, userId, reload: () => setVersion((v) => v + 1) };
}

// Sits under the gym name.
export function RatingLine({ summary }: { summary: ReviewSummary | null }) {
  if (!summary) return <View style={styles.ratingLine} />;
  return (
    <View style={styles.ratingLine}>
      <DumbbellRating value={summary.average} size={20} />
      {summary.average != null ? (
        <T v="callout" c="ink2">
          <T v="callout" style={styles.bold}>
            {summary.average.toFixed(1)}
          </T>
          {` · ${summary.count} review${summary.count === 1 ? '' : 's'}`}
        </T>
      ) : (
        <T v="callout" c="muted">
          No ratings yet
        </T>
      )}
    </View>
  );
}

type SectionProps = {
  gymId: string;
  slug: string;
  googleQuery: string;
  reviews: Review[] | null;
  userId: string | null;
  reload: () => void;
};

export function ReviewsSection({ gymId, slug, googleQuery, reviews, userId, reload }: SectionProps) {
  const [editing, setEditing] = useState(false);
  const mine = reviews?.find((r) => r.is_mine) ?? null;
  const hasSamples = reviews?.some((r) => r.is_sample) ?? false;
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleQuery)}`;

  let composer = null;
  if (!userId) {
    composer = (
      <View style={[styles.prompt, shadow.card]}>
        <ChatCircleText size={22} color={color.ink} />
        <View style={styles.flex}>
          <T v="bodyStrong">Trained here?</T>
          <T v="callout" c="muted">
            Log in to rate it out of 5 dumbbells.
          </T>
        </View>
        <Button
          label="Log in"
          variant="outline"
          size="s"
          onPress={() => router.push({ pathname: '/login', params: { next: `/gym/${slug}` } })}
        />
      </View>
    );
  } else if (reviews && (!mine || editing)) {
    composer = (
      <Composer
        key={mine?.id ?? 'new'}
        initial={mine}
        onCancel={mine ? () => setEditing(false) : undefined}
        onSave={async (rating, body) => {
          await saveReview(userId, gymId, rating, body);
          setEditing(false);
          reload();
        }}
      />
    );
  }

  return (
    <View style={styles.block}>
      <T v="title3">Reviews</T>
      {composer}
      {reviews === null ? null : reviews.length === 0 ? (
        <T v="callout" c="muted">
          No reviews yet.
        </T>
      ) : (
        <View style={styles.list}>
          {reviews.map((r) =>
            r.is_mine && editing ? null : (
              <ReviewCard key={r.id} review={r} userId={userId} onEdit={() => setEditing(true)} onChanged={reload} />
            ),
          )}
        </View>
      )}
      {hasSamples && (
        <T v="footnote" c="muted">
          Sample reviews are placeholders until DropSet members review this gym. They don’t count toward the rating.
        </T>
      )}
      <Press onPress={() => Linking.openURL(googleUrl)} haptic={false} accessibilityRole="link" style={styles.google}>
        <T v="callout" c="cobalt" style={styles.bold}>
          Read reviews on Google Maps
        </T>
        <ArrowSquareOut size={16} color={color.cobalt} weight="bold" />
      </Press>
    </View>
  );
}

function ReviewCard({ review: r, userId, onEdit, onChanged }: { review: Review; userId: string | null; onEdit: () => void; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, shadow.card]}>
      <View style={styles.cardHead}>
        {r.is_sample ? <Mark size={36} /> : <Avatar url={r.author_avatar} name={r.author_name ?? 'D'} size={36} />}
        <View style={styles.flex}>
          <T v="headline" numberOfLines={1}>
            {r.is_sample ? 'DropSet' : r.is_mine ? 'You' : r.author_name}
          </T>
          <T v="footnote" c="muted">
            {shortDate(r.created_at)}
          </T>
        </View>
        {r.is_sample ? <Badge label="Sample review" /> : <DumbbellRating value={r.rating} size={18} />}
      </View>
      {r.is_sample && <DumbbellRating value={r.rating} size={18} />}
      <T v="body" c="ink2">
        {r.body}
      </T>
      {r.is_mine ? (
        <View style={styles.actions}>
          <Action label="Edit" onPress={onEdit} disabled={busy} />
          <Action
            label={confirming ? 'Tap again to delete' : 'Delete'}
            danger={confirming}
            disabled={busy}
            onPress={() => (confirming ? run(async () => { await deleteReview(r.id); onChanged(); }) : setConfirming(true))}
          />
        </View>
      ) : userId && !r.is_sample ? (
        <View style={styles.actions}>
          <Action
            label={reported ? 'Reported. Thanks.' : 'Report'}
            disabled={busy || reported}
            onPress={() => run(async () => { await reportReview(userId, r.id); setReported(true); })}
          />
        </View>
      ) : null}
    </View>
  );
}

function Action({ label, onPress, danger, disabled }: { label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <Press onPress={onPress} disabled={disabled} haptic={false} hitSlop={8} accessibilityRole="button">
      <T v="footnote" c={danger ? 'danger' : 'muted'} style={styles.bold}>
        {label}
      </T>
    </Press>
  );
}

function Composer({ initial, onSave, onCancel }: { initial: Review | null; onSave: (rating: number, body: string) => Promise<void>; onCancel?: () => void }) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [body, setBody] = useState(initial?.body ?? '');
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const words = wordCount(body);
  const over = words > REVIEW_MAX_WORDS;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSave(rating, body);
    } catch {
      setError('Couldn’t post your review. Try again.');
      setSaving(false);
    }
  }

  return (
    <View style={[styles.composer, shadow.card]}>
      <T v="headline">{initial ? 'Edit your review' : 'Rate your visit'}</T>
      <DumbbellPicker value={rating} onChange={setRating} />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="What should a visitor know? Equipment, crowd, vibe…"
        placeholderTextColor={color.muted}
        selectionColor={color.cobalt}
        multiline
        maxLength={300}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="Your review"
        style={[styles.input, { borderColor: over ? color.danger : focused ? color.cobalt : color.line }]}
      />
      <View style={styles.composerFoot}>
        <T v="footnote" c={over ? 'danger' : 'muted'} style={styles.flex}>
          {error ?? `${words}/${REVIEW_MAX_WORDS} words`}
        </T>
        {onCancel && <Button label="Cancel" variant="ghost" size="s" onPress={onCancel} />}
        <Button
          label={initial ? 'Save' : 'Post review'}
          variant="dark"
          size="s"
          loading={saving}
          disabled={!rating || !words || over}
          onPress={submit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontFamily: font.bold },
  block: { gap: space.m },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: 22 },
  list: { gap: space.m },
  card: { backgroundColor: color.card, borderRadius: radius.l, padding: space.l, gap: space.s },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  actions: { flexDirection: 'row', gap: space.xl, marginTop: space.xs },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: space.m, backgroundColor: color.card, borderRadius: radius.l, padding: space.l },
  composer: { backgroundColor: color.card, borderRadius: radius.l, padding: space.l, gap: space.m },
  input: {
    minHeight: 96,
    borderWidth: 1.5,
    borderRadius: radius.m,
    padding: space.m,
    fontFamily: font.medium,
    fontSize: 16,
    color: color.ink,
    textAlignVertical: 'top',
  },
  composerFoot: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  google: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
});

import { Redirect, router } from 'expo-router';
import { CheckCircle, Info, Scan, Storefront, XCircle, type Icon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState, ScreenHeader, ScrollScreen, useWide } from '@/components/layout';
import { QrScanner } from '@/components/QrScanner';
import { T } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { deskCheckIn, getDeskStats, type DeskResult, type DeskStats } from '@/lib/api';
import { clockTime, money, passLength, shortDate } from '@/lib/format';
import { useStaffGyms } from '@/lib/use-staff-gyms';
import { useAuth } from '@/providers/AuthProvider';
import { color, font, layout, radius, shadow, space } from '@/theme/tokens';

const OUTCOME: Record<DeskResult['result'], { icon: Icon; title: string; bg: string; fg: string }> = {
  checked_in: { icon: CheckCircle, title: 'Checked in', bg: color.mintTint, fg: color.mint },
  already_in: { icon: Info, title: 'Already checked in', bg: color.sunken, fg: color.ink },
  expired: { icon: XCircle, title: 'Pass expired', bg: color.dangerTint, fg: color.danger },
  cancelled: { icon: XCircle, title: 'Pass cancelled', bg: color.dangerTint, fg: color.danger },
  not_found: { icon: XCircle, title: 'No pass with that code here', bg: color.dangerTint, fg: color.danger },
};

function Outcome({ r }: { r: DeskResult }) {
  const o = OUTCOME[r.result];
  const detail =
    r.result === 'checked_in' && r.expires_at
      ? `${passLength(r.duration_days ?? 1)} pass · good until ${shortDate(r.expires_at)}, ${clockTime(r.expires_at)}`
      : r.result === 'already_in' && r.checked_in_at
        ? `Checked in at ${clockTime(r.checked_in_at)}`
        : r.result === 'not_found'
          ? 'Check the code, or the pass may be for another gym.'
          : 'Ask them to buy a new pass in DropSet.';
  return (
    <View style={[styles.outcome, { backgroundColor: o.bg }]} accessibilityLiveRegion="polite">
      <o.icon size={28} color={o.fg} weight="fill" />
      <View style={styles.flex}>
        <T v="headline">{o.title}</T>
        <T v="callout" c="ink2">
          {detail}
        </T>
      </View>
      {r.holder_name && (
        <View style={styles.holder}>
          <Avatar url={r.holder_avatar} name={r.holder_name} size={40} />
          <T v="footnote" c="ink2" numberOfLines={1}>
            {r.holder_name}
          </T>
        </View>
      )}
    </View>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={[styles.tile, shadow.card]}>
      <T v="overline" c="muted">
        {label}
      </T>
      <T v="title2">{value}</T>
      {sub && (
        <T v="footnote" c="muted">
          {sub}
        </T>
      )}
    </View>
  );
}

function Stats({ stats, wide }: { stats: DeskStats; wide: boolean }) {
  const returning = Math.max(0, stats.visitors - stats.new);
  const tiles = [
    { label: 'Today', value: String(stats.today), sub: 'check-ins' },
    { label: 'Last 7 days', value: String(stats.week), sub: 'check-ins' },
    { label: 'Last 30 days', value: String(stats.month), sub: 'check-ins' },
    { label: 'Visitors · 30d', value: String(stats.visitors), sub: `${stats.new} new · ${returning} returning` },
    { label: 'Passes sold · 30d', value: String(stats.passes_sold) },
    { label: 'Revenue · 30d', value: money(stats.revenue_cents) },
  ];
  return (
    <View style={styles.block}>
      <View style={styles.tiles}>
        {tiles.map((t) => (
          <View key={t.label} style={{ width: wide ? '31.5%' : '48%' }}>
            <Tile {...t} />
          </View>
        ))}
      </View>
      <View style={[styles.recent, shadow.card]}>
        <T v="headline">Recent check-ins</T>
        {stats.recent.length ? (
          stats.recent.map((c) => (
            <View key={c.at} style={styles.recentRow}>
              <T v="callout" style={styles.flex} numberOfLines={1}>
                {c.name}
              </T>
              <T v="footnote" c="muted">
                {c.pass_type} pass · {shortDate(c.at)}, {clockTime(c.at)}
              </T>
            </View>
          ))
        ) : (
          <T v="callout" c="muted">
            No check-ins yet. They show up here the moment you scan a pass.
          </T>
        )}
      </View>
      <T v="footnote" c="muted">
        Counts only visits checked in through DropSet.
      </T>
    </View>
  );
}

// Front desk for gym staff: scan or type a pass, see what DropSet brought in.
export default function Desk() {
  const { ready, session } = useAuth();
  const wide = useWide();
  const gyms = useStaffGyms();
  const [picked, setPicked] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ gymId: string; r: DeskResult } | null>(null);
  const [stats, setStats] = useState<{ gymId: string; s: DeskStats } | null>(null);
  const [version, setVersion] = useState(0);

  const gym = gyms?.find((g) => g.id === picked) ?? gyms?.[0] ?? null;
  const gymId = gym?.id ?? null;

  useEffect(() => {
    if (!gymId) return;
    getDeskStats(gymId)
      .then((s) => setStats({ gymId, s }))
      .catch(() => {});
  }, [gymId, version]);

  if (ready && !session) return <Redirect href={{ pathname: '/login', params: { next: '/desk' } }} />;

  async function checkIn(value: string) {
    if (!gymId || !value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await deskCheckIn(gymId, value);
      setOutcome({ gymId, r });
      setCode('');
      setVersion((v) => v + 1);
    } catch {
      setError('Couldn’t reach DropSet. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const shownOutcome = outcome?.gymId === gymId ? outcome.r : null;
  const shownStats = stats?.gymId === gymId ? stats.s : null;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Front desk" subtitle={gym ? `${gym.name} · ${gym.city}` : undefined} width={layout.list} />
      {gyms === null ? (
        <ActivityIndicator color={color.ink} style={{ marginTop: space.huge }} />
      ) : !gym ? (
        <EmptyState
          icon={Storefront}
          title="For gym staff"
          body="This page is for front-desk staff at DropSet gyms. Ask the DropSet team to link your account to your gym."
          action="Back to Explore"
          onAction={() => router.replace('/explore')}
        />
      ) : (
        <ScrollScreen width={layout.list} gap={space.xxl}>
          {gyms.length > 1 && (
            <View style={styles.chips}>
              {gyms.map((g) => (
                <Chip key={g.id} label={g.name} selected={g.id === gym.id} onPress={() => setPicked(g.id)} />
              ))}
            </View>
          )}

          <View style={[styles.card, shadow.card]}>
            <T v="title3">Check in a pass</T>
            <TextField
              label="Pass code"
              value={code}
              onChangeText={setCode}
              placeholder="e.g. 7K3Q-92XF"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={() => checkIn(code)}
              style={styles.codeInput}
            />
            <View style={styles.row}>
              <Button label="Check in" variant="dark" size="m" onPress={() => checkIn(code)} loading={busy} disabled={!code.trim()} style={styles.flex} />
              <Button
                label={scanning ? 'Close camera' : 'Scan QR'}
                variant="outline"
                size="m"
                icon={Scan}
                onPress={() => setScanning((s) => !s)}
                style={styles.flex}
              />
            </View>
            {scanning && (
              <QrScanner
                onScan={(value) => {
                  setScanning(false);
                  checkIn(value);
                }}
              />
            )}
            {error && (
              <T v="footnote" c="danger">
                {error}
              </T>
            )}
            {shownOutcome && <Outcome r={shownOutcome} />}
          </View>

          <T v="title3">DropSet at {gym.name}</T>
          {shownStats ? <Stats stats={shownStats} wide={wide} /> : <ActivityIndicator color={color.ink} />}
        </ScrollScreen>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  card: { backgroundColor: color.card, borderRadius: radius.xl, padding: space.xl, gap: space.l },
  codeInput: { fontFamily: font.bold, letterSpacing: 2 },
  row: { flexDirection: 'row', gap: space.m },
  outcome: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, borderRadius: radius.l },
  holder: { alignItems: 'center', gap: 4, maxWidth: 96 },
  block: { gap: space.l },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.m },
  tile: { backgroundColor: color.card, borderRadius: radius.l, padding: space.l, gap: 4 },
  recent: { backgroundColor: color.card, borderRadius: radius.l, padding: space.l, gap: space.m },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
});

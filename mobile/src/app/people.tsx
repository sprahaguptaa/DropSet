import { Redirect } from 'expo-router';
import { MagnifyingGlass, UsersThree } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { EmptyState, ScreenHeader, ScrollScreen } from '@/components/layout';
import { PersonRow } from '@/components/People';
import { T } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { searchPeople, type Person } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { color, layout, space } from '@/theme/tokens';

// Find people by username or name.
export default function People() {
  const { ready, session } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ query: string; people: Person[] | null } | null>(null);
  const q = query.trim().replace(/^@/, '');

  useEffect(() => {
    if (q.length < 2) return;
    const t = setTimeout(() => {
      searchPeople(q)
        .then((people) => setResults({ query: q, people }))
        .catch(() => setResults({ query: q, people: null }));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  if (ready && !session) return <Redirect href={{ pathname: '/login', params: { next: '/people' } }} />;
  const current = results?.query === q ? results : null;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Find people" width={layout.form} />
      <ScrollScreen width={layout.form} gap={space.m}>
        <TextField
          label="Search"
          icon={MagnifyingGlass}
          value={query}
          onChangeText={setQuery}
          placeholder="Username or name"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {q.length < 2 ? (
          <T v="callout" c="muted">
            Type at least 2 letters. Ask friends for their DropSet username, or share yours from Profile.
          </T>
        ) : !current ? (
          <ActivityIndicator color={color.ink} style={{ marginTop: space.l }} />
        ) : !current.people ? (
          <T v="callout" c="danger">
            Couldn’t search right now. Try again.
          </T>
        ) : current.people.length === 0 ? (
          <EmptyState icon={UsersThree} title="No one found" body={`Nobody matches “${q}”.`} />
        ) : (
          current.people.map((p) => <PersonRow key={p.id} person={p} />)
        )}
      </ScrollScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
});

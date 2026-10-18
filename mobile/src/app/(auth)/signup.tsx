import { router } from 'expo-router';
import { EnvelopeSimple, LockSimple, PaperPlaneTilt, User } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { AuthScaffold, authStyles } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/layout';
import { Press } from '@/components/Press';
import { T } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { authRedirect, friendlyAuthError } from '@/lib/auth-links';
import { supabase } from '@/lib/supabase';
import { color, font } from '@/theme/tokens';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 0 = empty, 1 = weak, 2 = okay, 3 = strong
function strength(pw: string) {
  if (!pw) return 0;
  let score = pw.length >= 8 ? 1 : 0;
  if (/\d/.test(pw) && /[a-zA-Z]/.test(pw)) score++;
  if (pw.length >= 12 || /[^a-zA-Z0-9]/.test(pw)) score++;
  return Math.max(1, score);
}
const STRENGTH = [
  { label: '', color: color.line },
  { label: 'Too weak', color: color.danger },
  { label: 'Okay', color: '#E0A100' },
  { label: 'Strong', color: color.mint },
];

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const level = strength(password);

  async function submit() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'What should we call you?';
    if (!EMAIL.test(email.trim())) e.email = 'Enter a valid email address.';
    if (password.length < 8 || level < 2) e.password = 'Use at least 8 characters with a letter and a number.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: authRedirect('/explore') },
    });
    setBusy(false);
    if (error) return setErrors({ form: friendlyAuthError(error.message) });
    if (data.session) router.replace('/explore');
    else setSentTo(email.trim()); // project requires email confirmation
  }

  if (sentTo) {
    return (
      <AuthScaffold title="Check your inbox" subtitle={`We sent a confirmation link to ${sentTo}.`}>
        <EmptyState
          icon={PaperPlaneTilt}
          title="One tap left"
          body="Open the email on this device and tap the link to finish creating your account."
          action="Back to log in"
          onAction={() => router.replace('/login')}
        />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title="Create your account" subtitle="Save gyms, buy passes and check in with one QR code.">
      <View style={authStyles.form}>
        <TextField
          label="Name"
          icon={User}
          value={name}
          onChangeText={setName}
          error={errors.name}
          placeholder="Alex Rivera"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          ref={emailRef}
          label="Email"
          icon={EnvelopeSimple}
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <View style={styles.passwordBlock}>
          <TextField
            ref={passwordRef}
            label="Password"
            icon={LockSimple}
            secure
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {password.length > 0 && !errors.password && (
            <View style={styles.meter}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.bar, { backgroundColor: i <= level ? STRENGTH[level].color : color.line }]} />
              ))}
              <T v="footnote" c="muted" style={styles.meterLabel}>
                {STRENGTH[level].label}
              </T>
            </View>
          )}
        </View>
        {errors.form && (
          <View style={[authStyles.banner, { backgroundColor: color.dangerTint }]}>
            <T v="callout" c="danger">
              {errors.form}
            </T>
          </View>
        )}
        <Button label="Create account" onPress={submit} loading={busy} />
        <View style={authStyles.footer}>
          <T v="callout" c="muted">
            Already have an account?
          </T>
          <Press onPress={() => router.replace('/login')} haptic={false} accessibilityRole="link">
            <T v="callout" c="cobalt" style={{ fontFamily: font.bold }}>
              Log in
            </T>
          </Press>
        </View>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  passwordBlock: { gap: 8 },
  meter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  meterLabel: { width: 64, textAlign: 'right' },
});

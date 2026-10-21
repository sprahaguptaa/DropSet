import { router, useLocalSearchParams, type Href } from 'expo-router';
import { EnvelopeSimple, GoogleLogo, LockSimple } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { View, type TextInputInstance } from 'react-native';

import { AuthScaffold, authStyles } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { Press } from '@/components/Press';
import { T } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { friendlyAuthError, googleEnabled, LINK_NOTICES, signInWithGoogle, type LinkNotice } from '@/lib/auth-links';
import { supabase } from '@/lib/supabase';
import { color, font } from '@/theme/tokens';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { next, notice } = useLocalSearchParams<{ next?: string; notice?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  async function submit() {
    const e: typeof errors = {};
    if (!EMAIL.test(email.trim())) e.email = 'Enter a valid email address.';
    if (!password) e.password = 'Enter your password.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setErrors({ form: friendlyAuthError(error.message) });
    router.replace((next as Href) ?? '/explore');
  }

  return (
    <AuthScaffold title="Welcome back" subtitle="Log in to see your passes and saved gyms.">
      <View style={authStyles.form}>
        {notice && notice in LINK_NOTICES && (
          <View style={[authStyles.banner, { backgroundColor: color.sunken }]}>
            <T v="callout" c="ink2">
              {LINK_NOTICES[notice as LinkNotice]}
            </T>
          </View>
        )}
        <TextField
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
        <TextField
          ref={passwordRef}
          label="Password"
          icon={LockSimple}
          secure
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          placeholder="Your password"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Press onPress={() => router.push('/forgot-password')} haptic={false} accessibilityRole="link" style={{ alignSelf: 'flex-end' }}>
          <T v="callout" c="cobalt" style={{ fontFamily: font.bold }}>
            Forgot password?
          </T>
        </Press>
        {errors.form && (
          <View style={[authStyles.banner, { backgroundColor: color.dangerTint }]}>
            <T v="callout" c="danger">
              {errors.form}
            </T>
          </View>
        )}
        <Button label="Log in" onPress={submit} loading={busy} />
        {googleEnabled && (
          <>
            <View style={authStyles.divider}>
              <View style={authStyles.rule} />
              <T v="footnote" c="muted">
                or
              </T>
              <View style={authStyles.rule} />
            </View>
            <Button
              label="Continue with Google"
              variant="outline"
              icon={GoogleLogo}
              onPress={() => signInWithGoogle().catch((err: Error) => setErrors({ form: friendlyAuthError(err.message) }))}
            />
          </>
        )}
        <View style={authStyles.footer}>
          <T v="callout" c="muted">
            New to DropSet?
          </T>
          <Press onPress={() => router.replace('/signup')} haptic={false} accessibilityRole="link">
            <T v="callout" c="cobalt" style={{ fontFamily: font.bold }}>
              Create an account
            </T>
          </Press>
        </View>
      </View>
    </AuthScaffold>
  );
}

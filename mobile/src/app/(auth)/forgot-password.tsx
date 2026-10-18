import { router } from 'expo-router';
import { EnvelopeSimple, PaperPlaneTilt } from 'phosphor-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthScaffold, authStyles } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/layout';
import { T } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { authRedirect, friendlyAuthError } from '@/lib/auth-links';
import { supabase } from '@/lib/supabase';
import { color } from '@/theme/tokens';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!EMAIL.test(email.trim())) return setError('Enter the email you signed up with.');
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirect('/reset-password') });
    setBusy(false);
    if (err) return setFormError(friendlyAuthError(err.message));
    setSent(true);
  }

  if (sent) {
    return (
      <AuthScaffold title="Check your inbox" subtitle={`If ${email.trim()} has an account, a reset link is on its way.`}>
        <EmptyState
          icon={PaperPlaneTilt}
          title="Link sent"
          body="Open it on this device to choose a new password. It expires in an hour."
          action="Back to log in"
          onAction={() => router.replace('/login')}
        />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title="Reset your password" subtitle="Enter your email and we’ll send you a link to set a new one.">
      <View style={authStyles.form}>
        <TextField
          label="Email"
          icon={EnvelopeSimple}
          value={email}
          onChangeText={setEmail}
          error={error}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={submit}
        />
        {formError && (
          <View style={[authStyles.banner, { backgroundColor: color.dangerTint }]}>
            <T v="callout" c="danger">
              {formError}
            </T>
          </View>
        )}
        <Button label="Send reset link" onPress={submit} loading={busy} />
      </View>
    </AuthScaffold>
  );
}

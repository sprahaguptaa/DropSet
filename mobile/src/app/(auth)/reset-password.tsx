import { router } from 'expo-router';
import { LinkBreak, LockSimple } from 'phosphor-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthScaffold, authStyles } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/layout';
import { T } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { friendlyAuthError } from '@/lib/auth-links';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { color } from '@/theme/tokens';

// Reached from the email link: Supabase signs the person in with a recovery session first.
export default function ResetPassword() {
  const { ready, session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const e: typeof errors = {};
    if (password.length < 8 || !/\d/.test(password)) e.password = 'Use at least 8 characters with a number.';
    if (confirm !== password) e.confirm = 'Passwords don’t match.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setErrors({ form: friendlyAuthError(error.message) });
    router.replace('/explore');
  }

  if (ready && !session) {
    return (
      <AuthScaffold title="Link expired" subtitle="Reset links work once and only for an hour.">
        <EmptyState
          icon={LinkBreak}
          title="Let’s send a new one"
          body="Request another reset link and open it on this device."
          action="Send a new link"
          onAction={() => router.replace('/forgot-password')}
        />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title="Choose a new password" subtitle="You’ll stay logged in on this device.">
      <View style={authStyles.form}>
        <TextField
          label="New password"
          icon={LockSimple}
          secure
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label="Confirm password"
          icon={LockSimple}
          secure
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {errors.form && (
          <View style={[authStyles.banner, { backgroundColor: color.dangerTint }]}>
            <T v="callout" c="danger">
              {errors.form}
            </T>
          </View>
        )}
        <Button label="Save password" onPress={submit} loading={busy} />
      </View>
    </AuthScaffold>
  );
}

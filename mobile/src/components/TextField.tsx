import { Eye, EyeSlash, type Icon } from 'phosphor-react-native';
import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { color, font, radius, space } from '@/theme/tokens';

import { T } from './Text';

type Props = Omit<TextInputProps, 'ref'> & {
  ref?: Ref<TextInputInstance>;
  label: string;
  error?: string | null;
  hint?: string;
  icon?: Icon;
  secure?: boolean; // password field with a show/hide toggle
};

export function TextField({ ref, label, error, hint, icon: IconCmp, secure, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? color.danger : focused ? color.cobalt : color.line;

  return (
    <View style={styles.wrap}>
      <T v="footnote" c="ink2" style={styles.label}>
        {label}
      </T>
      <View style={[styles.box, { borderColor }, focused && !error && styles.focusRing]}>
        {IconCmp && <IconCmp size={18} color={focused ? color.cobalt : color.muted} />}
        <TextInput
          ref={ref}
          {...rest}
          secureTextEntry={secure && hidden}
          placeholderTextColor={color.muted}
          selectionColor={color.cobalt}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, style]}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            {hidden ? <Eye size={20} color={color.muted} /> : <EyeSlash size={20} color={color.muted} />}
          </Pressable>
        )}
      </View>
      {error ? (
        <T v="footnote" c="danger">
          {error}
        </T>
      ) : hint ? (
        <T v="footnote" c="muted">
          {hint}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: font.semibold },
  box: {
    height: 54,
    borderRadius: radius.m,
    borderWidth: 1.5,
    backgroundColor: color.card,
    paddingHorizontal: space.l,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
  },
  focusRing: { boxShadow: '0 0 0 4px rgba(45, 75, 255, 0.12)' },
  input: { flex: 1, height: '100%', fontFamily: font.medium, fontSize: 16, color: color.ink },
});

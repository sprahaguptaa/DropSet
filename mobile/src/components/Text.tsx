import { Text, type TextProps } from 'react-native';

import { color, type } from '@/theme/tokens';

export type TextVariant = keyof typeof type;
export type TextColor = keyof typeof color;

// <T v="title1">…</T> — the only text component in the app, so the type scale stays honest.
export function T({ v = 'body', c = 'ink', style, ...rest }: TextProps & { v?: TextVariant; c?: TextColor }) {
  return <Text {...rest} style={[type[v], { color: color[c] }, style]} />;
}

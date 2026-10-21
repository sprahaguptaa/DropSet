import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { color, font, radius } from '@/theme/tokens';

import { T } from './Text';

// Profile photo, or the first letter of the name on navy when there's no photo.
export function Avatar({ url, name, size = 40 }: { url?: string | null; name: string; size?: number }) {
  const shape = { width: size, height: size, borderRadius: radius.pill };
  if (url) return <Image source={url} style={[styles.base, shape]} contentFit="cover" transition={200} accessibilityLabel={`${name}'s photo`} />;
  return (
    <View style={[styles.base, styles.initial, shape]}>
      <T v="headline" c="onDark" style={{ fontSize: size * 0.4, lineHeight: size * 0.5, fontFamily: font.bold }}>
        {(name.trim()[0] ?? 'D').toUpperCase()}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: color.sunken, overflow: 'hidden' },
  initial: { backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' },
});

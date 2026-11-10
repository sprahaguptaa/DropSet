import { Platform, Share } from 'react-native';

const SITE_URL = 'https://dropset-app.vercel.app';

export function profileUrl(username: string) {
  const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  return `${origin}/u/${username}`;
}

// The system share sheet where there is one; on desktop browsers the link is copied instead.
export async function shareProfile(username: string): Promise<'shared' | 'copied'> {
  const url = profileUrl(username);
  if (Platform.OS === 'web') {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: 'DropSet', url });
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  }
  await Share.share({ message: url, url });
  return 'shared';
}

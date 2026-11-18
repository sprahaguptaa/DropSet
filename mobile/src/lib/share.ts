import { Platform, Share } from 'react-native';

const SITE_URL = 'https://dropset-app.vercel.app';

export function profileUrl(username: string) {
  const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  return `${origin}/u/${username}`;
}

// The system share sheet where there is one; on desktop browsers the link is copied instead.
// 'cancelled' means the person closed the sheet; anything that throws is a real failure.
export async function shareProfile(username: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = profileUrl(username);
  if (Platform.OS === 'web') {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'DropSet', url });
        return 'shared';
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return 'cancelled';
        throw e;
      }
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  }
  // iOS shows `url` as the link (adding it to `message` too would show it twice); Android only reads `message`.
  const result = await Share.share(Platform.OS === 'ios' ? { url } : { message: url });
  return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
}

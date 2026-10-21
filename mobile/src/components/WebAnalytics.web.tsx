import { Analytics } from '@vercel/analytics/react';
import { usePathname, useSegments } from 'expo-router';

// Page views for the live site. `route` groups dynamic pages (every gym counts as /gym/[slug]).
// Shows up once Analytics is enabled on the Vercel project.
export default function WebAnalytics() {
  const path = usePathname();
  const route = '/' + useSegments().filter((s) => !s.startsWith('(')).join('/');
  return <Analytics route={route} path={path} />;
}

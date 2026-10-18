import { NativeTabs } from 'expo-router/native-tabs';

import { color, font } from '@/theme/tokens';

// iOS / Android: the platform's own tab bar (Liquid Glass on iOS 26). Web: AppTabs.web.tsx.
export default function AppTabs() {
  return (
    <NativeTabs
      tintColor={color.ink}
      iconColor={{ default: color.muted, selected: color.ink }}
      labelStyle={{ default: { fontFamily: font.semibold, fontSize: 11, color: color.muted }, selected: { fontFamily: font.bold, fontSize: 11, color: color.ink } }}
      backgroundColor={color.card}
      indicatorColor={color.sunken}>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md="favorite" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="passes">
        <NativeTabs.Trigger.Label>Passes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'ticket', selected: 'ticket.fill' }} md="confirmation_number" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

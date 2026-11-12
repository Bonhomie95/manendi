import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';
import { useStore } from '@/lib/store';
import { tint, useColors } from '@/lib/theme';

export default function Tabs() {
  const c = useColors();
  const { data, all } = useStore();
  // Everyone erased (or never set up): back to the start, not empty tabs.
  if (!data.people.length) return <Redirect href="/welcome" />;
  const urgent = all.filter((x) => x.level === 'over' || x.level === 'urgent').length;
  return (
    <NativeTabs
      tintColor={c.accent}
      indicatorColor={tint(c.accent, 0.16)}
      badgeBackgroundColor={c.alt}
      minimizeBehavior="onScrollDown"
      // iOS keeps the system Liquid Glass bar; Android gets the brand surface + always-on labels (M3).
      backgroundColor={Platform.OS === 'android' ? c.card : undefined}
      labelVisibilityMode="labeled">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Status</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'clock', selected: 'clock.fill' }} md="schedule" />
        {urgent > 0 && <NativeTabs.Trigger.Badge>{String(urgent)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cases">
        <NativeTabs.Trigger.Label>Cases</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'tray.full', selected: 'tray.full.fill' }} md="inbox" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="radar">
        <NativeTabs.Trigger.Label>Radar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="dot.radiowaves.left.and.right" md="radar" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="travel">
        <NativeTabs.Trigger.Label>Travel</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="airplane" md="flight" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="family">
        <NativeTabs.Trigger.Label>Family</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="family_restroom" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

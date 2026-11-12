import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';
import { inDays, type Clock, type Person } from './rules';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

/** Asks once; true when reminders can be shown. */
export async function enableReminders(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', { name: 'Deadline reminders', importance: AndroidImportance.HIGH });
  }
  const { status, ios } = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  const ok = status === 'granted' || ios?.status === IosAuthorizationStatus.PROVISIONAL;
  if (ok) registerPush().catch(() => {});
  return ok;
}

// Case-change alerts arrive as push, which needs an EAS project id and a real device.
export async function registerPush() {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId || !Device.isDevice) return;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api('/device', { body: { pushToken: data } });
}

const LEADS = [90, 30, 7, 1, 0]; // days before each date

/** Local reminders for every dated clock, at 9:00 on the day. Runs on the phone, so they work offline. */
export async function scheduleReminders(all: Clock[], people: Person[]) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = Date.now();
  const who = (id: string) => (people.length > 1 ? `${people.find((p) => p.id === id)?.name ?? ''}: ` : '');
  const jobs: { at: Date; title: string; body: string }[] = [];
  for (const c of all) {
    if (!c.date || c.level === 'info' || c.level === 'over') continue;
    for (const lead of LEADS) {
      const at = new Date(`${c.date}T09:00:00`);
      at.setDate(at.getDate() - lead);
      if (+at <= now) continue;
      const when = lead === 0 ? 'Today' : inDays(lead).replace(/^in /, 'In ').replace(/^tomorrow$/, 'Tomorrow');
      jobs.push({ at, title: c.title, body: `${who(c.personId)}${when}. ${c.note}` });
    }
  }
  // iOS keeps at most 64 pending local notifications: the nearest ones win.
  for (const j of jobs.sort((a, b) => +a.at - +b.at).slice(0, 60)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: j.title, body: j.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: j.at, channelId: 'reminders' },
    });
  }
}

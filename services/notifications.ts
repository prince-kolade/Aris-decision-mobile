import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const MORNING = [
  'Good morning, beautiful. I\u2019m here if you need me.',
  'Good morning, love. Rise and shine \u2728',
  'Morning, gorgeous. Just a reminder that you\u2019re amazing.',
  'Good morning, Ari. I\u2019m always here for you.',
];

const AFTERNOON = [
  'Good afternoon, pretty. Just checking on you.',
  'Thinking of you this afternoon \u2665\uFE0F',
  'Hey you, hope your day is going well.',
  'Afternoon check-in: you\u2019ve got this!',
];

const EVENING = [
  'Good evening, gorgeous. How was your day?',
  'Just a reminder that you\u2019re loved \u2665\uFE0F',
  'Hey, I\u2019m here if you need to talk.',
  'Rest well tonight, you deserve it.',
];

const SUNDAY = [
  'Happy Sunday, love. Hope you have a blessed day.',
  'Happy Sunday! You\u2019re loved and appreciated.',
  'Sunday blessing: you are enough, always.',
  'Good morning, beautiful. Happy Sunday \u2665\uFE0F',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getMessagesForDay(): { morning: string; evening: string } {
  const isSunday = new Date().getDay() === 0;
  if (isSunday) {
    return {
      morning: pick(SUNDAY),
      evening: pick([...EVENING, ...SUNDAY]),
    };
  }
  return {
    morning: pick(MORNING),
    evening: pick(AFTERNOON),
  };
}

export async function setupNotifications(): Promise<void> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  const { morning, evening } = getMessagesForDay();
  const now = new Date();
  const today8am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
  const today2pm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);

  if (now < today8am) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Ari', body: morning, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 0 },
    });
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Ari', body: evening, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 14, minute: 0 },
    });
  } else if (now < today2pm) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Ari', body: evening, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 14, minute: 0 },
    });
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Ari', body: pick(EVENING), sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 0 },
    });
  } else {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Ari', body: pick(EVENING), sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 0 },
    });
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Ari', body: pick(EVENING), sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 14, minute: 0 },
    });
  }
}

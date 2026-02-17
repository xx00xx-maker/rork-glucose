import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ---------- 定数 ----------
const STORAGE_KEY_EXERCISE = 'reminder_exercise_enabled';
const STORAGE_KEY_HABIT = 'reminder_habit_enabled';
const STORAGE_KEY_HABIT_HOUR = 'reminder_habit_hour';
const STORAGE_KEY_HABIT_MINUTE = 'reminder_habit_minute';

// ---------- ネイティブモジュール安全ロード ----------

let Notifications: typeof import('expo-notifications') | null = null;

async function getNotifications() {
  if (Notifications) return Notifications;
  try {
    Notifications = await import('expo-notifications');
    return Notifications;
  } catch (e) {
    console.warn('[Notification] expo-notifications native module not available:', e);
    return null;
  }
}

// ---------- 初期設定 ----------

/** 通知チャンネル（Android）と前面表示の設定 */
export async function initNotifications(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;

  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('exercise-reminder', {
        name: '食後運動リマインダー',
        importance: N.AndroidImportance.HIGH,
      });
      await N.setNotificationChannelAsync('habit-reminder', {
        name: '習慣構築リマインダー',
        importance: N.AndroidImportance.HIGH,
      });
    }

    return true;
  } catch (e) {
    console.warn('[Notification] init failed:', e);
    return false;
  }
}

/** パーミッション要求。許可されたら true */
export async function requestPermissions(): Promise<boolean> {
  const N = await getNotifications();
  if (!N) return false;

  try {
    const { status: existingStatus } = await N.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await N.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('[Notification] permission request failed:', e);
    return false;
  }
}

// ---------- 設定の読み書き ----------

export interface ReminderSettings {
  exerciseEnabled: boolean;
  habitEnabled: boolean;
  habitHour: number;   // 0-23
  habitMinute: number; // 0-59
}

const DEFAULT_SETTINGS: ReminderSettings = {
  exerciseEnabled: true,
  habitEnabled: false,
  habitHour: 20,
  habitMinute: 0,
};

export async function loadReminderSettings(): Promise<ReminderSettings> {
  try {
    const [exercise, habit, hour, minute] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_EXERCISE),
      AsyncStorage.getItem(STORAGE_KEY_HABIT),
      AsyncStorage.getItem(STORAGE_KEY_HABIT_HOUR),
      AsyncStorage.getItem(STORAGE_KEY_HABIT_MINUTE),
    ]);
    return {
      exerciseEnabled: exercise !== null ? exercise === 'true' : DEFAULT_SETTINGS.exerciseEnabled,
      habitEnabled: habit !== null ? habit === 'true' : DEFAULT_SETTINGS.habitEnabled,
      habitHour: hour !== null ? parseInt(hour, 10) : DEFAULT_SETTINGS.habitHour,
      habitMinute: minute !== null ? parseInt(minute, 10) : DEFAULT_SETTINGS.habitMinute,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEY_EXERCISE, String(settings.exerciseEnabled)),
    AsyncStorage.setItem(STORAGE_KEY_HABIT, String(settings.habitEnabled)),
    AsyncStorage.setItem(STORAGE_KEY_HABIT_HOUR, String(settings.habitHour)),
    AsyncStorage.setItem(STORAGE_KEY_HABIT_MINUTE, String(settings.habitMinute)),
  ]);
}

// ---------- 食後運動リマインダー ----------

/**
 * 食事記録の15分後に「歩きましょう」通知をスケジュール。
 * exerciseEnabled が false なら何もしない。
 */
export async function scheduleExerciseReminder(): Promise<string | null> {
  const settings = await loadReminderSettings();
  if (!settings.exerciseEnabled) return null;

  const granted = await requestPermissions();
  if (!granted) return null;

  const N = await getNotifications();
  if (!N) return null;

  try {
    const id = await N.scheduleNotificationAsync({
      content: {
        title: '🏃 食後の運動タイム！',
        body: '食後15分経ちました。軽い散歩で血糖値スパイクを抑えましょう！',
        ...(Platform.OS === 'android' ? { channelId: 'exercise-reminder' } : {}),
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 15 * 60, // 15分後
      },
    });

    console.log('[Notification] Exercise reminder scheduled:', id);
    return id;
  } catch (e) {
    console.warn('[Notification] Exercise schedule failed:', e);
    return null;
  }
}

// ---------- 習慣構築リマインダー ----------

/**
 * 毎日指定時刻に繰り返しリマインダーをスケジュール。
 * 既存の習慣リマインダーをキャンセルしてから再登録する。
 */
export async function rescheduleHabitReminder(): Promise<string | null> {
  // まず既存の習慣リマインダーをすべてキャンセル
  await cancelHabitReminder();

  const settings = await loadReminderSettings();
  if (!settings.habitEnabled) return null;

  const granted = await requestPermissions();
  if (!granted) return null;

  const N = await getNotifications();
  if (!N) return null;

  try {
    const id = await N.scheduleNotificationAsync({
      content: {
        title: '📝 記録の時間です',
        body: '今日の食事や運動を記録して、健康管理を続けましょう！',
        ...(Platform.OS === 'android' ? { channelId: 'habit-reminder' } : {}),
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour: settings.habitHour,
        minute: settings.habitMinute,
      },
    });

    console.log(`[Notification] Habit reminder scheduled at ${settings.habitHour}:${String(settings.habitMinute).padStart(2, '0')}:`, id);
    return id;
  } catch (e) {
    console.warn('[Notification] Habit schedule failed:', e);
    return null;
  }
}

/** 習慣構築リマインダーだけキャンセル */
async function cancelHabitReminder(): Promise<void> {
  const N = await getNotifications();
  if (!N) return;

  try {
    const all = await N.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.content.title?.includes('記録の時間')) {
        await N.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (e) {
    console.warn('[Notification] Cancel habit reminder failed:', e);
  }
}

/** すべてのスケジュール済み通知をキャンセル */
export async function cancelAllReminders(): Promise<void> {
  const N = await getNotifications();
  if (!N) return;

  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('[Notification] Cancel all failed:', e);
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const keyFor = (userId: string) => `@risingpunk_black_hat_patch_last_ack_date_${userId}`;

function localCalendarYyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export async function getBlackHatPatchLastAckYyyyMmDd(userId: string): Promise<string | null> {
  const v = await AsyncStorage.getItem(keyFor(userId));
  return v && v.trim() ? v.trim() : null;
}

export async function setBlackHatPatchAcknowledgedToToday(userId: string): Promise<void> {
  const today = localCalendarYyyyMmDd(new Date());
  await AsyncStorage.setItem(keyFor(userId), today);
}

export function isBlackHatPatchUnreadForToday(lastAckYyyyMmDd: string | null): boolean {
  const today = localCalendarYyyyMmDd(new Date());
  return lastAckYyyyMmDd !== today;
}

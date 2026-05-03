import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  getBlackHatPatchLastAckYyyyMmDd,
  isBlackHatPatchUnreadForToday,
} from '../utils/blackHatPatchAckStorage';

/**
 * Once per local calendar day, Black Hat Patch Turf tile uses unread styling until the user opens the screen.
 */
export function useBlackHatPatchUnread(userId: string | undefined): { hasUnread: boolean; refresh: () => Promise<void> } {
  const [hasUnread, setHasUnread] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setHasUnread(false);
      return;
    }
    const last = await getBlackHatPatchLastAckYyyyMmDd(userId);
    setHasUnread(isBlackHatPatchUnreadForToday(last));
  }, [userId]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        refresh().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [refresh]);

  return { hasUnread, refresh };
}

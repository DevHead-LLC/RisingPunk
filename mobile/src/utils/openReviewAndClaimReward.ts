import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReviewUrlForOpen } from '../constants/updateUrls';

/**
 * Review state keys. Same value is used as: (1) legacy global key for migration read/remove,
 * (2) prefix for per-user keys (per-user key = `${KEY}_${userId}`). Do not change; legacy key must stay for migration (Bugbot).
 */
const REVIEW_OPENED_KEY = '@RisingPunk/hasOpenedReview';
const REVIEW_PROMPT_SEEN_KEY = '@RisingPunk/hasSeenReviewPrompt';

function reviewOpenedKey(userId: string): string {
  return `${REVIEW_OPENED_KEY}_${userId}`;
}
function reviewPromptSeenKey(userId: string): string {
  return `${REVIEW_PROMPT_SEEN_KEY}_${userId}`;
}

export async function markReviewOpened(userId: string | null): Promise<void> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) return;
  try {
    await AsyncStorage.setItem(reviewOpenedKey(userId.trim()), 'true');
  } catch {
    // ignore
  }
}

export async function getHasOpenedReview(userId: string | null): Promise<boolean> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) return false;
  const key = reviewOpenedKey(userId.trim());
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === 'true') return true;
    const legacy = await AsyncStorage.getItem(REVIEW_OPENED_KEY);
    if (legacy === 'true') {
      await AsyncStorage.setItem(key, 'true');
      // Do not remove legacy key: on multi-user devices every user must be able to inherit; removing would assign state to whichever user reads first (Bugbot).
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function setReviewPromptSeen(userId: string | null): Promise<void> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) return;
  try {
    await AsyncStorage.setItem(reviewPromptSeenKey(userId.trim()), 'true');
  } catch {
    // ignore
  }
}

export async function getHasSeenReviewPrompt(userId: string | null): Promise<boolean> {
  if (!userId || typeof userId !== 'string' || !userId.trim()) return false;
  const key = reviewPromptSeenKey(userId.trim());
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === 'true') return true;
    const legacy = await AsyncStorage.getItem(REVIEW_PROMPT_SEEN_KEY);
    if (legacy === 'true') {
      await AsyncStorage.setItem(key, 'true');
      // Do not remove legacy key: on multi-user devices every user must be able to inherit; removing would assign state to whichever user reads first (Bugbot).
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Open the store review URL (App Store / Play Store). No reward or claim.
 * Marks review as opened only when openURL succeeds. Returns true if opened (and marked), false otherwise (Bugbot: caller can update UI only on success).
 */
export async function openReviewUrl(userId: string | null): Promise<boolean> {
  const url = await getReviewUrlForOpen();
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      await markReviewOpened(userId);
      return true;
    }
    try {
      await Linking.openURL(url);
      await markReviewOpened(userId);
      return true;
    } catch {
      return false;
    }
  } catch {
    Linking.openURL(url).catch(() => {});
    return false;
  }
}

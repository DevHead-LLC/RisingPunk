import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReviewUrlForOpen } from '../constants/updateUrls';

/** Keys are scoped per userId so multiple users on the same device each have their own state (Bugbot: avoid cross-user leak). */
const REVIEW_OPENED_KEY_PREFIX = '@RisingPunk/hasOpenedReview';
const REVIEW_PROMPT_SEEN_KEY_PREFIX = '@RisingPunk/hasSeenReviewPrompt';
/** Legacy global keys (pre per-user). Migrated on first read then removed (Bugbot: avoid orphaned keys and state reset). */
const LEGACY_REVIEW_OPENED_KEY = '@RisingPunk/hasOpenedReview';
const LEGACY_REVIEW_PROMPT_SEEN_KEY = '@RisingPunk/hasSeenReviewPrompt';

function reviewOpenedKey(userId: string): string {
  return `${REVIEW_OPENED_KEY_PREFIX}_${userId}`;
}
function reviewPromptSeenKey(userId: string): string {
  return `${REVIEW_PROMPT_SEEN_KEY_PREFIX}_${userId}`;
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
    const legacy = await AsyncStorage.getItem(LEGACY_REVIEW_OPENED_KEY);
    if (legacy === 'true') {
      await AsyncStorage.setItem(key, 'true');
      await AsyncStorage.removeItem(LEGACY_REVIEW_OPENED_KEY);
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
    const legacy = await AsyncStorage.getItem(LEGACY_REVIEW_PROMPT_SEEN_KEY);
    if (legacy === 'true') {
      await AsyncStorage.setItem(key, 'true');
      await AsyncStorage.removeItem(LEGACY_REVIEW_PROMPT_SEEN_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Open the store review URL (App Store / Play Store). No reward or claim.
 * Marks review as opened for this userId so Profile shows "Thank you for your review!"
 */
export async function openReviewUrl(userId: string | null): Promise<void> {
  const url = await getReviewUrlForOpen();
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
    else Linking.openURL(url).catch(() => {});
  } catch {
    Linking.openURL(url).catch(() => {});
  }
  await markReviewOpened(userId);
}

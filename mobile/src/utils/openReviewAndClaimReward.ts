import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReviewUrlForOpen } from '../constants/updateUrls';

/** Keys are scoped per userId so multiple users on the same device each have their own state (Bugbot: avoid cross-user leak). */
const REVIEW_OPENED_KEY_PREFIX = '@RisingPunk/hasOpenedReview';
const REVIEW_PROMPT_SEEN_KEY_PREFIX = '@RisingPunk/hasSeenReviewPrompt';

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
  try {
    return (await AsyncStorage.getItem(reviewOpenedKey(userId.trim()))) === 'true';
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
  try {
    return (await AsyncStorage.getItem(reviewPromptSeenKey(userId.trim()))) === 'true';
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

import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReviewUrlForOpen } from '../constants/updateUrls';

/** Client-only: user has tapped to open the store review (Profile shows "Thank you" when set). */
export const REVIEW_OPENED_KEY = '@RisingPunk/hasOpenedReview';

export async function markReviewOpened(): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEW_OPENED_KEY, 'true');
  } catch {
    // ignore
  }
}

export async function getHasOpenedReview(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(REVIEW_OPENED_KEY)) === 'true';
  } catch {
    return false;
  }
}

/**
 * Open the store review URL (App Store / Play Store). No reward or claim.
 * Used by ReviewPromptModal and ProfileScreen Account card.
 * Call markReviewOpened() after so Profile can show "Thank you for your review!"
 */
export async function openReviewUrl(): Promise<void> {
  const url = await getReviewUrlForOpen();
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
    else Linking.openURL(url).catch(() => {});
  } catch {
    Linking.openURL(url).catch(() => {});
  }
  await markReviewOpened();
}

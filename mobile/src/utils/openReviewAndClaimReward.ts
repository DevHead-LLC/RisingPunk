import { Linking } from 'react-native';
import { getReviewUrlForOpen } from '../constants/updateUrls';

/**
 * Open the store review URL (App Store / Play Store). No reward or claim.
 * Used by ReviewPromptModal and ProfileScreen Account card.
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
}

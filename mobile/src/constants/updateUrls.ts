import { Linking, Platform } from 'react-native';
import Config from 'react-native-config';

/**
 * URL the user is sent to when they tap "Update" on the Update Required screen.
 * iOS → App Store, Android → Play Store, everyone else → risingpunk.com.
 * Override via env: APP_STORE_UPDATE_URL, GOOGLE_PLAY_UPDATE_URL, DEFAULT_UPDATE_URL.
 */
export function getUpdateUrl(): string {
  if (Platform.OS === 'ios') {
    return Config.APP_STORE_UPDATE_URL || 'https://apps.apple.com/app/risingpunk/id6749834469';
  }
  if (Platform.OS === 'android') {
    return Config.GOOGLE_PLAY_UPDATE_URL || 'https://play.google.com/store/apps/details?id=com.devheadllc.risingpunk';
  }
  return Config.DEFAULT_UPDATE_URL || 'https://risingpunk.com';
}

/**
 * URL for "Leave us a rating" / review. iOS → App Store write-review, Android → Play Store app page, other → website.
 */
export function getReviewUrl(): string {
  if (Platform.OS === 'ios') {
    return Config.APP_STORE_REVIEW_URL || 'https://apps.apple.com/app/id6749834469?action=write-review';
  }
  if (Platform.OS === 'android') {
    return Config.GOOGLE_PLAY_REVIEW_URL || 'https://play.google.com/store/apps/details?id=com.devheadllc.risingpunk';
  }
  return Config.DEFAULT_UPDATE_URL || 'https://risingpunk.com';
}

const FALLBACK_WEBSITE_URL = Config.DEFAULT_UPDATE_URL || 'https://risingpunk.com';

/**
 * Returns the URL to open for "review us". On iOS simulator the App Store URL often cannot be opened (invalid address in Safari), so we check canOpenURL and fall back to the website when the store URL is not openable.
 */
export async function getReviewUrlForOpen(): Promise<string> {
  const storeUrl = getReviewUrl();
  if (Platform.OS === 'ios') {
    try {
      const canOpen = await Linking.canOpenURL(storeUrl);
      if (!canOpen) return FALLBACK_WEBSITE_URL;
    } catch {
      return FALLBACK_WEBSITE_URL;
    }
  }
  return storeUrl;
}

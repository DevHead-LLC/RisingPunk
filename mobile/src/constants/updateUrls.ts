import { Platform } from 'react-native';
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

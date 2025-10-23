import Config from 'react-native-config';

// DEBUG: Log what's being loaded from environment
console.log('🔍 DEBUG - Raw Config values:');
console.log('🔍 Config.GOOGLE_IOS_CLIENT_ID:', Config.GOOGLE_IOS_CLIENT_ID);
console.log('🔍 Config.GOOGLE_WEB_CLIENT_ID:', Config.GOOGLE_WEB_CLIENT_ID);
console.log('🔍 Config.GOOGLE_ANDROID_CLIENT_ID:', Config.GOOGLE_ANDROID_CLIENT_ID);
console.log('🔍 Config.GOOGLE_ANDROID_WEB_CLIENT_ID:', Config.GOOGLE_ANDROID_WEB_CLIENT_ID);

// Google Sign-In Configuration using environment variables
export const GOOGLE_AUTH_CONFIG = {
  // iOS Client ID from Google Cloud Console
  iosClientId: Config.GOOGLE_IOS_CLIENT_ID || '',
  
  // Web Client ID for iOS
  webClientId: Config.GOOGLE_WEB_CLIENT_ID || '',
  
  // Android Client ID from Google Cloud Console
  androidClientId: Config.GOOGLE_ANDROID_CLIENT_ID || '',
  
  // Android Web Client ID (same as Android Client ID)
  androidWebClientId: Config.GOOGLE_ANDROID_WEB_CLIENT_ID || '',
  
  // Bundle ID
  bundleId: Config.BUNDLE_ID || 'com.devheadllc.risingpunk',
  
  // URL Scheme
  urlScheme: Config.GOOGLE_URL_SCHEME || '',
};

// Environment-specific configuration
export const getGoogleAuthConfig = () => {
  return GOOGLE_AUTH_CONFIG;
};

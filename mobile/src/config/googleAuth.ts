import Config from 'react-native-config';


// Google Sign-In Configuration using environment variables
export const GOOGLE_AUTH_CONFIG = {
  // iOS Client ID from Google Cloud Console
  iosClientId: Config.GOOGLE_IOS_CLIENT_ID || '',
  
  // Web Client ID for iOS
  webClientId: Config.GOOGLE_WEB_CLIENT_ID || '',
  
  // Android Client ID from Google Cloud Console (OAuth client type 1)
  androidClientId: Config.GOOGLE_ANDROID_CLIENT_ID || '',
  
  // Android Web Client ID - MUST be the Web Client ID (OAuth client type 3), NOT the Android Client ID
  // This is used for Google Sign In on Android
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

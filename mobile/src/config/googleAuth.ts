import Config from 'react-native-config';

// Google Sign-In Configuration using environment variables
export const GOOGLE_AUTH_CONFIG = {
  // iOS Client ID from Google Cloud Console
  iosClientId: Config.GOOGLE_IOS_CLIENT_ID || '',
  
  // Web Client ID - This should be the WEB client ID, not iOS
  webClientId: Config.GOOGLE_WEB_CLIENT_ID || '',
  
  // Bundle ID
  bundleId: Config.BUNDLE_ID || 'com.devheadllc.risingpunk',
  
  // URL Scheme
  urlScheme: Config.GOOGLE_URL_SCHEME || '',
};

// Environment-specific configuration
export const getGoogleAuthConfig = () => {
  return GOOGLE_AUTH_CONFIG;
};

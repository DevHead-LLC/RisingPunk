// Temporarily revert to hardcoded values to test if environment variables are the issue
// import Config from 'react-native-config';

// Debug logging for environment variables
console.log('🔧 Google Auth Config Debug: Using HARDCODED values for testing');

// Google Sign-In Configuration - HARDCODED FOR TESTING
export const GOOGLE_AUTH_CONFIG = {
  // iOS Client ID from Google Cloud Console
  iosClientId: '213914599866-omj66uek6jte9rrge2secalb8sf4bacs.apps.googleusercontent.com',
  
  // Web Client ID - This should be the WEB client ID, not iOS
  webClientId: '213914599866-omj66uek6jte9rrge2secalb8sf4bacs.apps.googleusercontent.com',
  
  // Bundle ID
  bundleId: 'com.devheadllc.risingpunk',
  
  // URL Scheme
  urlScheme: 'com.googleusercontent.apps.213914599866-omj66uek6jte9rrge2secalb8sf4bacs',
};

console.log('🔧 Final GOOGLE_AUTH_CONFIG (HARDCODED):', GOOGLE_AUTH_CONFIG);

// Environment-specific configuration
export const getGoogleAuthConfig = () => {
  return {
    iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,
    webClientId: GOOGLE_AUTH_CONFIG.webClientId,
    bundleId: GOOGLE_AUTH_CONFIG.bundleId,
    urlScheme: GOOGLE_AUTH_CONFIG.urlScheme,
  };
};

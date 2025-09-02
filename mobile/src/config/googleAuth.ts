// Google Sign-In Configuration
export const GOOGLE_AUTH_CONFIG = {
  // iOS Client ID from Google Cloud Console
  iosClientId: '213914599866-omj66uek6jte9rrge2secalb8sf4bacs.apps.googleusercontent.com',
  
  // Web Client ID (same as iOS for server verification)
  webClientId: '213914599866-omj66uek6jte9rrge2secalb8sf4bacs.apps.googleusercontent.com',
  
  // Bundle ID
  bundleId: 'com.devheadllc.risingpunk',
  
  // URL Scheme
  urlScheme: 'com.googleusercontent.apps.213914599866-omj66uek6jte9rrge2secalb8sf4bacs',
};

// Environment-specific configuration
export const getGoogleAuthConfig = () => {
  return {
    iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,
    webClientId: GOOGLE_AUTH_CONFIG.webClientId,
    bundleId: GOOGLE_AUTH_CONFIG.bundleId,
    urlScheme: GOOGLE_AUTH_CONFIG.urlScheme,
  };
};

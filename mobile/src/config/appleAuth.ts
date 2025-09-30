import Config from 'react-native-config';

// Apple Sign-In Configuration
export const APPLE_AUTH_CONFIG = {
  // Bundle ID from your Apple Developer account
  bundleId: Config.BUNDLE_ID,
  
  // Note: Apple Developer Team ID and Key ID are only needed on the server side
  // for token verification. The client side only needs the bundle ID for configuration.
};

// Environment-specific configuration
export const getAppleAuthConfig = () => {
  return {
    bundleId: APPLE_AUTH_CONFIG.bundleId,
  };
};

import Config from 'react-native-config';
  import { Platform } from 'react-native';

// Environment detection based on build configuration
const getApiUrl = () => {
  try {
    // Check for environment variables first (set during build)
    const apiEnv = Config.API_ENV;
    
    // Helper function to get dev URL based on platform from .env files
    const getDevUrl = () => {
      return Platform.OS === 'android' 
        ? Config.DEV_URL_ANDROID || 'http://10.0.2.2:5001'  // Android emulator from .env
        : Config.DEV_URL_IOS || 'http://localhost:5001'; // iOS simulator from .env
    };
    
    if (apiEnv) {
      switch (apiEnv) {
        case 'dev':
          return getDevUrl();
        case 'staging':
          return Config.API_URL || 'https://api.risingpunk.dev';  // Read from .env.staging
        case 'prod':
          return Config.API_URL || 'https://api.risingpunk.com';  // Read from .env.prod
        default:
          console.error(`🚨 INVALID API_ENV: "${apiEnv}". Expected: dev, staging, or prod. Falling back to staging.`);
          return Config.API_URL || 'https://api.risingpunk.dev';
      }
    }
    
    // Check if this is a production build
    const isProductionBuild = !__DEV__;
    
    if (isProductionBuild) {
      // Production build with undefined API_ENV is a critical error
      console.error(`
🚨 CRITICAL: API_ENV is undefined in production build!

Expected: API_ENV to be set during build
Actual: API_ENV is undefined
Config object: ${JSON.stringify(Config, null, 2)}

This is a build configuration error that must be fixed:
- Check that ENVFILE is set in package.json scripts (should use -DENVFILE=.env.prod for Android builds)
- Verify .env.prod file exists and contains API_ENV=prod
- Ensure react-native-config is properly configured
- Rebuild the app with correct environment configuration

Falling back to staging server for now, but this should NEVER happen in production!
      `);
    } else {
      // Dev/staging builds can fall back to staging for development convenience
      console.warn(`
⚠️ WARNING: Environment detection failed in development build

Expected: API_ENV to be set during build
Actual: API_ENV is undefined
Config object: ${JSON.stringify(Config, null, 2)}

Falling back to staging server: https://api.risingpunk.dev

This indicates a build configuration problem:
- Check that ENVFILE is set in package.json scripts
- Verify .env files exist and contain API_ENV
- Ensure react-native-config is properly configured
      `);
    }
    
    // Fallback to staging (for dev convenience, but should be fixed for production)
    return Config.API_URL || 'https://api.risingpunk.dev';
  } catch (error) {
    console.error('🚨 CRITICAL: Error reading config:', error);
    // Fallback to staging to prevent app crash
    return 'https://api.risingpunk.dev';
  }
};

export const API_URL = getApiUrl();

// Export environment info for debugging
export const getEnvironmentInfo = () => {
  const apiEnv = Config.API_ENV;
  const apiUrl = API_URL;
  const isProductionBuild = !__DEV__;
  
  return {
    apiEnv: apiEnv || 'undefined',
    apiUrl,
    isProductionBuild,
    isDevMode: __DEV__,
    configObject: {
      API_ENV: Config.API_ENV,
      API_URL: Config.API_URL,
      DEV_URL_ANDROID: Config.DEV_URL_ANDROID,
      DEV_URL_IOS: Config.DEV_URL_IOS,
    },
  };
};

// Check environment configuration on module load
const envInfo = getEnvironmentInfo();

// Critical warning if production build is not using production environment
if (envInfo.isProductionBuild) {
  if (envInfo.apiEnv !== 'prod' || !envInfo.apiUrl.includes('risingpunk.com')) {
    console.error(`
🚨🚨🚨 CRITICAL PRODUCTION BUILD ERROR 🚨🚨🚨

This is a PRODUCTION build but it's NOT configured for production!

Expected:
  - API_ENV: prod
  - API_URL: https://api.risingpunk.com

Actual:
  - API_ENV: ${envInfo.apiEnv}
  - API_URL: ${envInfo.apiUrl}

This build will connect to the WRONG server!
This is a build configuration error that MUST be fixed before deployment!

Build configuration:
  - Check that ENVFILE=.env.prod is set during build
  - Verify .env.prod contains API_ENV=prod and API_URL=https://api.risingpunk.com
  - Rebuild with correct environment configuration

🚨🚨🚨 END CRITICAL ERROR 🚨🚨🚨
    `);
  }
}

// Animation timing constants
export const ANIMATION_CONFIG = {
  // Frame rate timing
  FPS_60_INTERVAL_MS: 16,         // 60fps animation interval (16ms)
  
  // Animation durations
  QUICK_SYNC_DURATION_MS: 32,     // Quick animation sync duration
  
  // Polling intervals
  BATTLE_PHASE_POLLING_MS: 2000,  // Reduced from 200ms to 2 seconds during battle
  DEFAULT_POLLING_MS: 5000,       // Reduced from 1 second to 5 seconds for other phases
} as const;

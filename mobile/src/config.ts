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
    
    // Log warning but don't crash - use staging as fallback for production builds
    console.error(`
🚨 WARNING: Environment detection failed!

Expected: API_ENV to be set during build
Actual: API_ENV is undefined
Config object: ${JSON.stringify(Config, null, 2)}

Falling back to staging server: https://api.risingpunk.dev

This indicates a build configuration problem:
- Check that ENVFILE is set in package.json scripts
- Verify .env files exist and contain API_ENV
- Ensure react-native-config is properly configured
    `);
    
    // Fallback to staging for production builds to prevent crashes
    return Config.API_URL || 'https://api.risingpunk.dev';
  } catch (error) {
    console.error('🚨 CRITICAL: Error reading config:', error);
    // Fallback to staging to prevent app crash
    return 'https://api.risingpunk.dev';
  }
};

export const API_URL = getApiUrl();

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

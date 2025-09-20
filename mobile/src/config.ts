import Config from 'react-native-config';

// Environment detection based on build configuration
const getApiUrl = () => {
  // Check for environment variables first (set during build)
  const apiEnv = Config.API_ENV;
  if (apiEnv) {
    switch (apiEnv) {
      case 'dev':
        return 'http://localhost:5001';
      case 'staging':
        return 'https://api.risingpunk.dev';
      case 'prod':
        return 'https://api.risingpunk.com';
      default:
        return 'http://localhost:5001';
    }
  }
  
  // Fallback to __DEV__ for backward compatibility
  return __DEV__
    ? 'http://localhost:5001'  // or 'http://10.0.2.2:5001' for Android emulator
    : 'https://api.risingpunk.dev';
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

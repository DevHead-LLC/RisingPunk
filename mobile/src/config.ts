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
        return 'https://api.risingpunk.dev:8080';
      case 'prod':
        return 'https://api.risingpunk.com:8081';
      default:
        return 'http://localhost:5001';
    }
  }
  
  // Fallback to __DEV__ for backward compatibility
  return __DEV__
    ? 'http://localhost:5001'  // or 'http://10.0.2.2:5001' for Android emulator
    : 'https://staging-api.risingpunk.com';
};

export const API_URL = getApiUrl();

// Animation timing constants
export const ANIMATION_CONFIG = {
  // Frame rate timing
  FPS_60_INTERVAL_MS: 16,         // 60fps animation interval (16ms)
  
  // Animation durations
  QUICK_SYNC_DURATION_MS: 32,     // Quick animation sync duration
  
  // Polling intervals
  BATTLE_PHASE_POLLING_MS: 200,   // Fast polling during active battle
  DEFAULT_POLLING_MS: 1000,       // Default polling for other phases
} as const;

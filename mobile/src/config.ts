// For iOS simulator
export const API_URL = __DEV__
  ? 'http://localhost:5001'  // or 'http://10.0.2.2:5001' for Android emulator
  : 'https://your-production-url.com';

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

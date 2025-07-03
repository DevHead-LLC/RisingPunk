// For iOS simulator
export const API_URL = __DEV__ 
  ? 'http://localhost:5001'  // or 'http://10.0.2.2:5001' for Android emulator
  : 'https://your-production-url.com';

// For Android simulator
// export const API_URL = 'http://10.0.2.2:5001'; 

// REGRESSION_DEBUG flag removed 

// ============================================================================
// CONFIGURATION
// ============================================================================

// Debug flags for development
export const DEBUG_CONFIG = {
  STEP_3_1: false, // Set to true to enable Step 3.1 debug logs
  STEP_4_4: false, // Set to true to enable Step 4.4 pathfinding debug logs
  STEP_5_1: false, // Set to true to enable Step 5.1 battalion targeting debug logs
};

// Global debug flags for easy access
if (typeof global !== 'undefined') {
  global.DEBUG_STEP_3_1 = DEBUG_CONFIG.STEP_3_1;
  global.DEBUG_STEP_4_4 = DEBUG_CONFIG.STEP_4_4;
  global.DEBUG_STEP_5_1 = DEBUG_CONFIG.STEP_5_1;
} 
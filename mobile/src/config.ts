// For iOS simulator
export const API_URL = __DEV__ 
  ? 'http://localhost:3001'  // or 'http://10.0.2.2:3001' for Android emulator
  : 'https://your-production-url.com';

// For Android simulator
// export const API_URL = 'http://10.0.2.2:3001'; 
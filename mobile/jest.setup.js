/* eslint-env jest */

// import 'react-native-gesture-handler/jestSetup'; // Removed - not installed

// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper'); // Removed for compatibility
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-svg', () => 'Svg');
// jest.mock('react-native', () => require('react-native/jest/mock')); // Removed - not available

// Mock requestAnimationFrame
global.requestAnimationFrame = callback => setTimeout(callback, 0);

// Mock performance.now()
global.performance = {
  now: jest.fn(() => Date.now())
};

// React Native specific mocks
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Dimensions
import { Dimensions } from 'react-native';
jest.spyOn(Dimensions, 'get').mockReturnValue({
  width: 375,
  height: 812,
  scale: 1,
  fontScale: 1
}); 
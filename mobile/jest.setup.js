// Mock react-native
const RN = require('react-native');

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.StatusBarManager = {
    getHeight: jest.fn(),
  };

  return Object.setPrototypeOf(
    {
      Platform: {
        OS: 'ios',
        select: jest.fn(obj => obj.ios),
      },
      NativeModules: RN.NativeModules,
      View: 'View',
      Text: 'Text',
      Animated: {
        View: 'Animated.View',
        Value: jest.fn(function(initialValue) {
          return {
            _value: initialValue,
            interpolate: jest.fn(() => ({
              interpolate: jest.fn(),
              __getValue: () => this._value
            })),
            setValue: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
            removeAllListeners: jest.fn(),
            stopAnimation: jest.fn(callback => callback && callback(this._value))
          };
        }),
        timing: jest.fn(() => ({
          start: jest.fn(callback => callback && callback({ finished: true }))
        })),
        spring: jest.fn(() => ({
          start: jest.fn(callback => callback && callback({ finished: true }))
        })),
        sequence: jest.fn(animations => ({
          start: jest.fn(callback => callback && callback({ finished: true }))
        })),
        loop: jest.fn(animation => ({
          start: jest.fn(callback => callback && callback({ finished: true })),
          stop: jest.fn()
        }))
      },
      StyleSheet: {
        create: styles => styles,
        flatten: jest.fn(style => {
          if (Array.isArray(style)) {
            return Object.assign({}, ...style);
          }
          return style || {};
        }),
      }
    },
    RN
  );
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  Value: jest.fn(initial => ({
    value: initial,
    setValue: jest.fn(),
    interpolate: jest.fn()
  }))
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

// Mock console methods to prevent noise during tests
console.error = jest.fn();
console.warn = jest.fn();

// Setup and cleanup
beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

import React from 'react';

// Mock NativeModules
const NativeModules = {
  SettingsManager: {
    settings: {
      AppleLocale: 'en_US',
      AppleLanguages: ['en'],
    },
  },
  StatusBarManager: {
    getHeight: jest.fn(),
    setStyle: jest.fn(),
    setHidden: jest.fn(),
  },
  PlatformConstants: {
    isTesting: true,
  },
  NativeAnimatedModule: {
    startOperationBatch: jest.fn(),
    finishOperationBatch: jest.fn(),
    createAnimatedNode: jest.fn(),
    connectAnimatedNodes: jest.fn(),
    disconnectAnimatedNodes: jest.fn(),
    startAnimatingNode: jest.fn(),
    stopAnimation: jest.fn(),
    setAnimatedNodeValue: jest.fn(),
    connectAnimatedNodeToView: jest.fn(),
    disconnectAnimatedNodeFromView: jest.fn(),
    dropAnimatedNode: jest.fn(),
    addAnimatedEventToView: jest.fn(),
    removeAnimatedEventFromView: jest.fn(),
  },
};

// Mock DeviceEventEmitter
const DeviceEventEmitter = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  emit: jest.fn(),
};

// Mock NativeEventEmitter
class NativeEventEmitter {
  addListener = jest.fn();
  removeListener = jest.fn();
  removeAllListeners = jest.fn();
  emit = jest.fn();
}

// Mock Dimensions
const Dimensions = {
  get: jest.fn().mockReturnValue({
    width: 375,
    height: 812,
    scale: 1,
    fontScale: 1,
  }),
  set: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock Animated
const Animated = {
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  createAnimatedComponent: (component) => component,
  Value: function(value) {
    this.setValue = jest.fn();
    this.setOffset = jest.fn();
    this.flattenOffset = jest.fn();
    this.addListener = jest.fn();
    this.removeListener = jest.fn();
    this.interpolate = jest.fn().mockReturnValue({
      interpolate: jest.fn(),
    });
    return this;
  },
  ValueXY: function() {
    return {
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      setValue: jest.fn(),
      setOffset: jest.fn(),
      flattenOffset: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };
  },
  timing: jest.fn().mockReturnValue({
    start: jest.fn((callback) => callback && callback()),
    stop: jest.fn(),
  }),
  spring: jest.fn().mockReturnValue({
    start: jest.fn((callback) => callback && callback()),
    stop: jest.fn(),
  }),
  parallel: jest.fn().mockReturnValue({
    start: jest.fn((callback) => callback && callback()),
    stop: jest.fn(),
  }),
};

// Mock basic React Native components
const RN = {
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  TextInput: 'TextInput',
  Animated,
  Dimensions,
  NativeModules,
  DeviceEventEmitter,
  NativeEventEmitter,
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  StyleSheet: {
    create: (styles) => styles,
    flatten: jest.fn(),
  },
  I18nManager: {
    isRTL: false,
  },
  PixelRatio: {
    get: jest.fn(() => 1),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((size) => size),
    roundToNearestPixel: jest.fn((size) => size),
  },
};

// Mock performance.now()
global.performance = {
  now: jest.fn(() => Date.now()),
};

// Mock ReactNativeFeatureFlags
global.ReactNativeFeatureFlags = {
  shouldEmitW3CPointerEvents: () => false,
  shouldPressibilityUseW3CPointerEventsForHover: () => false,
};

// Mock LayoutAnimation
global.LayoutAnimation = {
  configureNext: jest.fn(),
  create: jest.fn(),
  Types: {},
  Properties: {},
  Presets: {
    easeInEaseOut: {},
    linear: {},
    spring: {},
  },
};

// Export mocked React Native
module.exports = {
  ...RN,
}; 
module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: null,
        android: null,
      },
    },
    'react-native-config': {
      platforms: {
        android: null, // disable autolinking on Android (manually linked)
        // iOS autolinking remains enabled - no platform override needed
      },
    },
  },
  assets: ['./src/assets/fonts/'],
};

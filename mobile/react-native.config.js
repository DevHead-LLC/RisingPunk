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
        android: null, // disable autolinking on Android
        ios: null, // disable autolinking on iOS
      },
    },
  },
  assets: ['./src/assets/fonts/'],
};

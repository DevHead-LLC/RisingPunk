const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Disable package exports to fix EventEmitter parsing issues in RN 0.76+
    unstable_enablePackageExports: false,
  },
  // Spurious reloads: watchman uses .watchmanconfig ignore_dirs. If the blue
  // "Refreshing..." bar keeps showing and images struggle, try:
  // watchman watch-del-all && npx react-native start --reset-cache
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

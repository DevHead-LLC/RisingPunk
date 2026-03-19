const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [path.resolve(__dirname, '..')],
  resolver: {
    // Disable package exports to fix EventEmitter parsing issues in RN 0.76+
    unstable_enablePackageExports: false,
  },
  transformer: {
    // Use Babel to parse so Flow (including const type params in RN source) is stripped.
    // Hermes parser doesn't support Flow syntax and can throw on ViewConfigIgnore.js etc.
    hermesParser: false,
  },
  // Spurious reloads: watchman uses .watchmanconfig ignore_dirs. If the blue
  // "Refreshing..." bar keeps showing and images struggle, try:
  // watchman watch-del-all && npx react-native start --reset-cache
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

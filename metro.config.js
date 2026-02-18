const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { resolver: { assetExts, sourceExts } } = defaultConfig;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    assetExts: [...assetExts, 'bin'],
    sourceExts: [...sourceExts, 'jsx', 'js', 'ts', 'tsx', 'json'],
  },
};

module.exports = mergeConfig(defaultConfig, config);

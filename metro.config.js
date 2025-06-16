const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Добавляем поддержку для react-native-url-polyfill
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-url-polyfill/auto': require.resolve('react-native-url-polyfill/auto'),
};

module.exports = config;
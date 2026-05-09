const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Permite que Metro resuelva correctamente @taoqf/react-native-mqtt
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;

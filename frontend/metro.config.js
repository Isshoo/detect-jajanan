const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ensure these file types are handled properly
config.resolver.assetExts.push(
  // Add any additional asset extensions you need
  "db",
  "mp3",
  "ttf",
  "obj",
  "png",
  "jpg"
);

module.exports = config;

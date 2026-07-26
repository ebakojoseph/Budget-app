import "dotenv/config";

export default ({ config }) => ({
  ...config,

  owner: "ebakojoseph",
  scheme: "askzwg",

  android: {
    ...config.android,
    package: "com.emergent.spreadsheetmobile.askzwg",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#000000",
    },
    edgeToEdgeEnabled: true,
    intentFilters: [
      {
        action: "VIEW",
        data: [{ scheme: "askzwg" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },

  ios: {
    ...config.ios,
    bundleIdentifier: "com.emergent.spreadsheetmobile.askzwg",
    supportsTablet: true,
  },

  extra: {
    ...config.extra,

    expoGo: {
      disableAuthProxy: true,
    },

    eas: {
      projectId: "97a7b19e-ac1c-43ed-ae65-8f860e570c5c",
    },

    EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
    ANDROID_CLIENT_ID: process.env.ANDROID_CLIENT_ID,
    EXPO_CLIENT_ID: process.env.EXPO_CLIENT_ID,
  },
});

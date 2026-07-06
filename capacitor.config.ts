import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "dev.gelbhart.jetlag",
  appName: "Jet Lag Map Companion",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      iconColor: "#C55B40",
    },
  },
};

export default config;

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sevenelevenshao.openherbology",
  appName: "Open Herbology",
  // The Next.js static export. Run `npm run build` before `npx cap sync`.
  webDir: "out",
  android: {
    // Private sideloaded build — allow the debug APK to be installed over itself.
    allowMixedContent: false,
  },
};

export default config;

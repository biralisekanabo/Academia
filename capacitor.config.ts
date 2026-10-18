import type { CapacitorConfig } from "@capacitor/cli";

/**
 * URL de l'application déployée chargée dans le WebView natif.
 * Surchargée par la variable d'environnement EDUPLEX_APP_URL au moment du build.
 *
 * Remplacer la valeur ci-dessous par le domaine réel (ex. https://eduplex.vercel.app).
 */
const APP_URL = process.env.EDUPLEX_APP_URL ?? "https://openlu.vercel.app";

const config: CapacitorConfig = {
  appId: "com.eduplex.app",
  appName: "Eduplex",
  webDir: "native/www",
  server: {
    url: APP_URL,
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0f0f1aff",
  },
};

export default config;

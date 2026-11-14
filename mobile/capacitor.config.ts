import type { CapacitorConfig } from "@capacitor/cli";

// L'app charge directement le site en ligne : chaque déploiement Vercel
// met l'app à jour, sans repasser par l'App Store / le Play Store.
// Quand ambiancerugby.fr deviendra le domaine principal, changer SITE ici
// (et dans allowNavigation) puis lancer `npm run sync`.
const SITE = "https://ambiance-rugby.fr";

const config: CapacitorConfig = {
  appId: "fr.ambiancerugby.app",
  appName: "Ambiance Rugby",
  // page de secours embarquée (affichée seulement si le site ne répond pas)
  webDir: "www",
  backgroundColor: "#3e1621",
  server: {
    url: SITE,
    cleartext: false,
    // domaines autorisés à s'ouvrir DANS l'app (le reste part dans le navigateur)
    allowNavigation: [
      "ambiance-rugby.fr",
      "*.ambiance-rugby.fr",
      "ambiancerugby.fr",
      "*.ambiancerugby.fr",
      "*.supabase.co",
      "checkout.stripe.com",
      "*.stripe.com",
    ],
    errorPath: "hors-ligne.html",
  },
  ios: {
    contentInset: "never",
    scheme: "Ambiance Rugby",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#3e1621",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#3e1621",
      overlaysWebView: false,
    },
  },
};

export default config;

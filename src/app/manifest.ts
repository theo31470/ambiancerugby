import type { MetadataRoute } from "next";

/** Manifeste de l'app installable (PWA) : nom, icônes, couleurs et raccourcis de l'écran d'accueil. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ambiance Rugby",
    short_name: "Ambiance Rugby",
    description: "Scores en direct, classements, stats des joueurs, pronos et actus du rugby, côté tribune.",
    lang: "fr",
    dir: "ltr",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#3e1621",
    theme_color: "#3e1621",
    categories: ["sports", "news"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // appui long sur l'icône (Android) / clic droit (ordinateur)
    shortcuts: [
      { name: "Matchs en direct", short_name: "Matchs", url: "/matchs?source=raccourci", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Actus", url: "/actus?source=raccourci", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Clubs", url: "/clubs?source=raccourci", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Pronos", url: "/pronos?source=raccourci", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

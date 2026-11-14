import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getViewer, publicClient } from "@/lib/supabase/server";
import type { Prefs } from "@/lib/membres";
import Tactile from "@/components/deco/Tactile";

// polices hébergées avec le site : Shrikhand (grands titres groovy), Bricolage Grotesque (titres, scores), Instrument Sans (texte)
const groovy = localFont({ variable: "--font-groovy", src: "./fonts/shrikhand.woff2", weight: "400", display: "swap" });
const titre = localFont({ variable: "--font-titre", src: "./fonts/bricolage.woff2", weight: "200 800", display: "swap" });
const texte = localFont({
  variable: "--font-texte",
  display: "swap",
  src: [
    { path: "./fonts/instrument.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/instrument-italic.woff2", weight: "400 700", style: "italic" },
  ],
});

// écrans de démarrage de l'app iPhone : [largeur, hauteur, densité] de chaque modèle (images dans public/splash)
const DEMARRAGE: [number, number, number][] = [
  [440, 956, 3], [430, 932, 3], [420, 912, 3], [402, 874, 3], [393, 852, 3], [390, 844, 3],
  [428, 926, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2], [375, 667, 2], [320, 568, 2],
];

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://ambiance-rugby.fr"),
  title: { default: "Ambiance Rugby — le rugby côté tribune", template: "%s · Ambiance Rugby" },
  description: "Scores en direct, classements, Indice Ambiance des clubs, pronostics, stats des joueurs et actus du Top 14, de la Pro D2, des coupes d'Europe et du Tournoi.",
  openGraph: { siteName: "Ambiance Rugby", locale: "fr_FR", type: "website", images: ["/og.jpg"] },
  twitter: { card: "summary_large_image" },
  applicationName: "Ambiance Rugby",
  keywords: ["rugby", "Top 14", "Pro D2", "score rugby en direct", "classement Top 14", "résultats rugby", "pronostic rugby", "stats joueurs rugby", "Champions Cup", "Tournoi des Six Nations"],
  formatDetection: { telephone: false },
  // app installée sur iPhone (écran d'accueil) : plein écran, barre d'état fondue dans le bordeaux, écran de démarrage
  appleWebApp: {
    capable: true,
    title: "Ambiance Rugby",
    statusBarStyle: "black-translucent",
    startupImage: DEMARRAGE.map(([l, h, r]) => ({
      url: `/splash/splash-${l * r}x${h * r}.png`,
      media: `(device-width: ${l}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
    })),
  },
};

export const viewport: Viewport = {
  viewportFit: "cover", // encoches de l'iPhone gérées en CSS (env(safe-area-inset-*))
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3e1621" },
    { media: "(prefers-color-scheme: dark)", color: "#260d14" },
  ],
};

/** Cadre commun (polices, thème) : le site public et le studio d'administration ont chacun leur propre habillage. */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  const prefs = (viewer?.prefs ?? {}) as Prefs;
  const theme = prefs.theme === "sombre" ? "dark" : prefs.theme === "clair" ? "light" : undefined;
  // Supporters : le site aux couleurs de leur club (accents seulement, contraste garanti en CSS)
  let club: string | null = null;
  if (viewer?.supporter && prefs.couleurs_club && viewer.favorite_team_id) {
    const { data } = await publicClient().from("teams").select("color").eq("id", viewer.favorite_team_id).maybeSingle();
    if (data?.color && /^#[0-9a-f]{6}$/i.test(data.color)) club = data.color;
  }
  return (
    <html lang="fr" data-theme={theme} data-club={club ? "" : undefined} style={club ? ({ "--club": club } as React.CSSProperties) : undefined} className={`${groovy.variable} ${titre.variable} ${texte.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col"><Tactile />{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getViewer } from "@/lib/supabase/server";
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://ambiance-rugby.fr"),
  title: { default: "Ambiance Rugby — le rugby côté tribune", template: "%s · Ambiance Rugby" },
  description: "Scores en direct, classements, Indice Ambiance des clubs, pronostics, stats des joueurs et actus du Top 14, de la Pro D2, des coupes d'Europe et du Tournoi.",
  openGraph: { siteName: "Ambiance Rugby", locale: "fr_FR", type: "website", images: ["/og.jpg"] },
};

export const viewport: Viewport = {
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
  return (
    <html lang="fr" data-theme={theme} className={`${groovy.variable} ${titre.variable} ${texte.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col"><Tactile />{children}</body>
    </html>
  );
}

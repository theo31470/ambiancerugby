import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Scoreboard from "@/components/Scoreboard";
import Celebration from "@/components/deco/Celebration";
import { getTickerMatches } from "@/lib/queries";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://ambiancerugby.vercel.app"),
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const ticker = await getTickerMatches();
  return (
    <html lang="fr" className={`${groovy.variable} ${titre.variable} ${texte.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:bg-surface focus:p-2">
          Aller au contenu
        </a>
        <Scoreboard initial={ticker} />
        <Header />
        <main id="contenu" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {children}
        </main>
        <Footer />
        <Celebration />
      </body>
    </html>
  );
}

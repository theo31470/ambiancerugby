import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Scoreboard from "@/components/Scoreboard";
import Celebration from "@/components/deco/Celebration";
import AppInstallable from "@/components/app/AppInstallable";
import { getViewer } from "@/lib/supabase/server";
import { getTickerMatches } from "@/lib/queries";
import type { Prefs } from "@/lib/membres";

/** Habillage du site public : bandeau des scores, menu, pied de page, célébrations en direct. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [ticker, viewer] = await Promise.all([getTickerMatches(), getViewer()]);
  const prefs = (viewer?.prefs ?? {}) as Prefs;
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:bg-surface focus:p-2">
        Aller au contenu
      </a>
      <Scoreboard initial={ticker} />
      <Header />
      <main id="contenu" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {children}
      </main>
      <Footer />
      {prefs.celebrations !== false && <Celebration />}
      <AppInstallable />
    </>
  );
}

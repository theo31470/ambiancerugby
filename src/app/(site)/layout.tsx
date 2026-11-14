import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Scoreboard from "@/components/Scoreboard";
import Celebration from "@/components/deco/Celebration";
import AppInstallable from "@/components/app/AppInstallable";
import BarreOnglets from "@/components/nav/BarreOnglets";
import SousOnglets from "@/components/nav/SousOnglets";
import { createClient, getViewer, hasBadge } from "@/lib/supabase/server";
import { getTickerMatches } from "@/lib/queries";
import type { Prefs } from "@/lib/membres";

/** Habillage du site public : bandeau des scores, menu, pied de page, célébrations en direct. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [ticker, viewer] = await Promise.all([getTickerMatches(), getViewer()]);
  const prefs = (viewer?.prefs ?? {}) as Prefs;
  let nonLues = 0;
  if (viewer) {
    const supabase = await createClient();
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null);
    nonLues = count ?? 0;
  }
  const initiale = viewer ? (viewer.display_name ?? viewer.email ?? "?").slice(0, 1).toUpperCase() : null;
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:bg-surface focus:p-2">
        Aller au contenu
      </a>
      <Scoreboard initial={ticker} />
      <Header />
      <main id="contenu" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <SousOnglets />
        {children}
      </main>
      <Footer />
      {/* place pour la barre d'onglets du bas (mobile) */}
      <div aria-hidden className="lg:hidden bg-bordeaux h-[calc(4rem+env(safe-area-inset-bottom))]" />
      <BarreOnglets initiale={initiale} supporter={hasBadge(viewer)} nonLues={nonLues} />
      {prefs.celebrations !== false && <Celebration />}
      <AppInstallable />
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getViewer } from "@/lib/supabase/server";
import { isoFromNow } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import RechercheRapide from "@/components/admin/RechercheRapide";
import { quitterStudio } from "../(acces)/actions";

export const metadata: Metadata = { title: { default: "Studio", template: "%s · Studio Ambiance Rugby" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Championnats suivis en priorité pour la saisie des stats. */
const COMPS_SAISIE = ["top-14", "pro-d2"];

export default async function AdminLayout({ children }: LayoutProps<"/studio">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/studio/connexion");
  // seuls rédacteurs et administrateurs entrent (le code à 6 chiffres est vérifié avant, à chaque requête)
  if (viewer.role === "user") redirect("/studio/securite");

  // ce qui attend la rédaction : brouillons, et matchs récents de Top 14 / Pro D2 sans feuille saisie
  const db = await createClient();
  const [{ count: brouillons }, { data: recents }, { count: commentaires }, { count: aTraiter }] = await Promise.all([
    db.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
    db.from("matches").select("id, competition:competitions!inner(slug)").eq("status", "finished")
      .gte("kickoff_at", isoFromNow(-10 * 86400e3)).in("competition.slug", COMPS_SAISIE),
    db.from("comments").select("id", { count: "exact", head: true }).gte("created_at", isoFromNow(-86400e3)),
    db.from("shop_orders").select("id", { count: "exact", head: true }).in("statut", ["payee", "probleme"]),
  ]);
  const ids = (recents ?? []).map((m) => m.id);
  const { data: saisis } = ids.length ? await db.from("player_match_stats").select("match_id").in("match_id", ids) : { data: [] };
  const faits = new Set((saisis ?? []).map((s) => s.match_id));
  const aSaisir = ids.filter((id) => !faits.has(id)).length;

  const nav = <AdminNav brouillons={brouillons ?? 0} aSaisir={aSaisir} commentaires={commentaires ?? 0} aTraiter={aTraiter ?? 0} admin={viewer.role === "admin"} />;
  return (
    <div className="min-h-screen bg-teinte/40 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="bg-bordeaux text-white lg:h-screen lg:sticky lg:top-0 flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 lg:px-5 pt-4 lg:pt-6 pb-3">
          <Link href="/studio" className="groovy text-3xl text-moutarde">Studio</Link>
          <a href="/" target="_blank" rel="noopener" className="text-xs font-semibold text-white/70 underline underline-offset-2">Voir le site ↗</a>
        </div>
        {/* sur mobile, la navigation se replie */}
        <details className="lg:hidden px-4 pb-4">
          <summary className="cursor-pointer rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold">Menu du studio</summary>
          <div className="mt-3">{nav}</div>
        </details>
        <div className="hidden lg:block flex-1 overflow-y-auto px-5 pb-6">{nav}</div>
        <div className="hidden lg:flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <span className="w-9 h-9 shrink-0 rounded-full bg-white/15 grid place-items-center font-bold">{(viewer.display_name ?? viewer.email ?? "?").slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{viewer.display_name ?? viewer.email}</p>
            <p className="text-xs text-white/55">{viewer.role === "admin" ? "Administrateur" : "Rédacteur"}, connexion sécurisée</p>
          </div>
          <form action={quitterStudio}><button title="Se déconnecter" className="text-xs font-semibold text-white/70 hover:text-white">Sortir</button></form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-trait bg-fond/90 backdrop-blur px-4 sm:px-8 py-3">
          <RechercheRapide />
        </header>
        <main id="contenu" className="px-4 sm:px-8 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

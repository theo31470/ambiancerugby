import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getViewer } from "@/lib/supabase/server";
import { isoFromNow } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import RechercheRapide from "@/components/admin/RechercheRapide";

export const metadata: Metadata = { title: "Rédaction", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Championnats suivis en priorité pour la saisie des stats. */
const COMPS_SAISIE = ["top-14", "pro-d2"];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/connexion?suite=/admin");
  if (viewer.role === "user") {
    return (
      <div className="max-w-md">
        <h1 className="groovy text-4xl text-vin">Espace rédaction</h1>
        <p className="mt-3 text-sourdine">Votre compte n&apos;a pas accès à la rédaction. Demandez à un administrateur de vous donner le rôle de rédacteur.</p>
      </div>
    );
  }

  // ce qui attend la rédaction : brouillons, et matchs récents de Top 14 / Pro D2 sans feuille saisie
  const db = await createClient();
  const [{ count: brouillons }, { data: recents }, { count: commentaires }] = await Promise.all([
    db.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
    db.from("matches").select("id, competition:competitions!inner(slug)").eq("status", "finished")
      .gte("kickoff_at", isoFromNow(-10 * 86400e3)).in("competition.slug", COMPS_SAISIE),
    db.from("comments").select("id", { count: "exact", head: true }).gte("created_at", isoFromNow(-86400e3)),
  ]);
  const ids = (recents ?? []).map((m) => m.id);
  const { data: saisis } = ids.length ? await db.from("player_match_stats").select("match_id").in("match_id", ids) : { data: [] };
  const faits = new Set((saisis ?? []).map((s) => s.match_id));
  const aSaisir = ids.filter((id) => !faits.has(id)).length;

  return (
    <div className="pleine-largeur -my-6 sm:-my-10 bg-teinte/40 min-h-[80vh]">
      <div className="max-w-[90rem] mx-auto lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:min-h-[80vh]">
        <aside className="bg-bordeaux text-white lg:min-h-full">
          <div className="lg:sticky lg:top-16 p-4 lg:p-5 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-4 lg:mb-6">
              <p className="groovy text-2xl text-moutarde">Rédaction</p>
              <Link href="/" className="text-xs font-semibold text-white/70 underline underline-offset-2">Voir le site</Link>
            </div>
            {/* sur mobile, la navigation se replie */}
            <details className="lg:hidden group">
              <summary className="cursor-pointer rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold">Menu de la rédaction</summary>
              <div className="mt-3"><AdminNav brouillons={brouillons ?? 0} aSaisir={aSaisir} commentaires={commentaires ?? 0} admin={viewer.role === "admin"} /></div>
            </details>
            <div className="hidden lg:block"><AdminNav brouillons={brouillons ?? 0} aSaisir={aSaisir} commentaires={commentaires ?? 0} admin={viewer.role === "admin"} /></div>
            <p className="hidden lg:block mt-8 text-xs text-white/50">Connecté : {viewer.display_name ?? viewer.email}{viewer.role === "admin" ? ", administrateur" : ", rédacteur"}</p>
          </div>
        </aside>
        <div className="min-w-0 px-4 sm:px-8 py-6 sm:py-8">
          <div className="flex justify-end mb-6"><RechercheRapide /></div>
          {children}
        </div>
      </div>
    </div>
  );
}

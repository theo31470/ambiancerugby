import Link from "next/link";
import type { Metadata } from "next";
import { createClient, getViewer, hasBadge } from "@/lib/supabase/server";
import { toutLu, viderAlertes } from "../../actions";
import { fmtRelative } from "@/lib/format";
import { Poteaux, Trompette } from "@/components/deco/Icones";
import ActiverNotifications from "./ActiverNotifications";

export const metadata: Metadata = { title: "Mes alertes" };

const ICONE: Record<string, string> = { kickoff: "Coup d'envoi", try: "Essai", halftime: "Mi-temps", final: "Fin" };

export default async function AlertesPage() {
  const viewer = (await getViewer())!;
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(60);
  const list = data ?? [];
  const nonLues = list.filter((n) => !n.read_at).length;
  const badge = hasBadge(viewer);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h2 className="groovy text-3xl text-vin mr-auto">Mes alertes</h2>
        {nonLues > 0 && <form action={toutLu}><button className="bouton-discret">Tout marquer comme lu</button></form>}
        {list.length > 0 && <form action={viderAlertes}><button className="bouton-discret">Tout effacer</button></form>}
      </div>

      {!badge && (
        <div className="mb-6 rounded-2xl bg-bordeaux text-white p-5 flex flex-wrap items-center gap-4">
          <Trompette className="w-14 h-auto text-white" />
          <p className="flex-1 min-w-56">Les alertes de match (coup d&apos;envoi, essais, score final de vos clubs) sont réservées aux Supporters.</p>
          <Link href="/abonnement" className="bouton-or">Devenir Supporter</Link>
        </div>
      )}
      {badge && <ActiverNotifications />}

      {list.length === 0 ? (
        <div className="bg-surface border border-dashed border-trait rounded-2xl p-10 text-center">
          <Poteaux className="w-12 h-auto mx-auto text-vin" />
          <p className="mt-3 text-sourdine">Aucune alerte pour l&apos;instant. Suivez des clubs et elles arriveront pendant leurs matchs.</p>
        </div>
      ) : (
        <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait overflow-hidden">
          {list.map((n) => (
            <li key={n.id}>
              <Link href={n.url ?? "#"} className={`flex items-start gap-4 px-5 py-4 hover:bg-teinte ${n.read_at ? "" : "bg-rose/40"}`}>
                <span className={`mt-1 shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 ${n.kind === "try" ? "bg-moutarde text-bordeaux" : "bg-teinte text-sourdine"}`}>{ICONE[n.kind] ?? "Info"}</span>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold block">{n.title}</span>
                  {n.body && <span className="text-sourdine tnum">{n.body}</span>}
                </span>
                <span className="text-xs text-sourdine shrink-0">{fmtRelative(n.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

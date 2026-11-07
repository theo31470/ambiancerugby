import Link from "next/link";
import { isoFromNow } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import Notice from "@/components/admin/Notice";
import MatchRow from "@/components/MatchRow";
import { MATCH_SELECT } from "@/lib/queries";
import type { MatchFull } from "@/lib/types";

export default async function AdminMatchs({ searchParams }: PageProps<"/admin/matchs">) {
  const sp = await searchParams;
  const db = await createClient();
  const { data: comps } = await db.from("competitions").select("id,slug,name,oanor_id").order("sort_order");
  const comp = (comps ?? []).find((c) => c.slug === sp.c);
  const vue = sp.vue === "passes" ? "passes" : "a-venir";

  let q = db.from("matches").select(MATCH_SELECT);
  if (comp) q = q.eq("competition_id", comp.id);
  q = vue === "a-venir"
    ? q.gte("kickoff_at", isoFromNow(-12 * 3600e3)).order("kickoff_at")
    : q.lt("kickoff_at", isoFromNow(0)).order("kickoff_at", { ascending: false });
  const { data } = await q.limit(80);
  const matches = (data ?? []) as unknown as MatchFull[];
  const href = (o: { c?: string; vue?: string }) => {
    const p = new URLSearchParams();
    const c = o.c ?? (comp?.slug ?? "");
    const v = o.vue ?? vue;
    if (c) p.set("c", c);
    if (v !== "a-venir") p.set("vue", v);
    return `/admin/matchs${p.size ? `?${p}` : ""}`;
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-extrabold mr-auto">Matchs et direct</h1>
        <Link href={`/admin/matchs/nouveau${comp ? `?c=${comp.id}` : ""}`} className="bouton">Ajouter un match</Link>
      </div>
      <Notice sp={sp} />
      <div className="flex flex-wrap gap-2 mb-4">
        <Link href={href({ vue: "a-venir" })} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${vue === "a-venir" ? "bg-encre text-fond" : "hover:bg-teinte"}`}>À venir</Link>
        <Link href={href({ vue: "passes" })} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${vue === "passes" ? "bg-encre text-fond" : "hover:bg-teinte"}`}>Passés</Link>
        <span className="w-px bg-trait mx-1" aria-hidden />
        <Link href={href({ c: "" })} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${!comp ? "bg-encre text-fond" : "hover:bg-teinte"}`}>Toutes</Link>
        {(comps ?? []).map((c) => (
          <Link key={c.id} href={href({ c: c.slug })} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${comp?.id === c.id ? "bg-encre text-fond" : "hover:bg-teinte"}`}>{c.name}</Link>
        ))}
      </div>
      {comp?.oanor_id && (
        <p className="mb-4 text-sm text-sourdine">Cette compétition est mise à jour automatiquement : vos modifications sur un match synchronisé peuvent être écrasées à la prochaine synchronisation.</p>
      )}
      {matches.length === 0 ? <p className="text-sourdine">Aucun match.</p> : (
        <ul className="bg-surface border border-trait rounded-lg divide-y divide-trait overflow-hidden">
          {matches.map((m) => (
            <li key={m.id} className="flex items-center">
              <div className="flex-1 min-w-0"><MatchRow m={m} showDate /></div>
              <span className="hidden sm:inline text-xs text-sourdine w-28 truncate">{m.competition.short_name}</span>
              <Link href={`/admin/matchs/${m.id}`} className="bouton-discret mr-3 shrink-0">{m.source === "manual" ? "Saisir" : "Voir"}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

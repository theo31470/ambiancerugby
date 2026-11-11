import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import TeamBadge from "@/components/TeamBadge";
import { fmtRelative } from "@/lib/format";
import type { TeamLite } from "@/lib/types";

type Club = TeamLite & { is_national: boolean; country: string | null; wiki_title: string | null; squad_count: number | null; squad_synced_at: string | null; slug: string };

export default async function AdminClubs({ searchParams }: PageProps<"/studio/clubs">) {
  const sp = await searchParams;
  const db = await createClient();
  const q = typeof sp.q === "string" ? sp.q.trim().replace(/[%,()]/g, "") : "";
  const comp = typeof sp.comp === "string" ? sp.comp : "";
  const filtre = typeof sp.f === "string" ? sp.f : "";
  const { data: comps } = await db.from("competitions").select("id,slug,name,current_season").eq("active", true).order("sort_order");

  let ids: string[] | null = null;
  const c = (comps ?? []).find((x) => x.slug === comp);
  if (c) {
    const { data: liens } = await db.from("team_competitions").select("team_id").eq("competition_id", c.id).eq("season", c.current_season);
    ids = (liens ?? []).map((l) => l.team_id);
  }
  let req = db.from("teams").select("id,slug,name,short_name,abbreviation,logo_url,color,is_national,country,wiki_title,squad_count,squad_synced_at").order("name").limit(400);
  if (q) req = req.ilike("name", `%${q}%`);
  if (ids) req = req.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  if (filtre === "sans-logo") req = req.is("logo_url", null);
  if (filtre === "sans-effectif") req = req.eq("is_national", false).or("squad_count.is.null,squad_count.lt.12");
  if (filtre === "selections") req = req.eq("is_national", true);
  const { data } = await req;
  const clubs = (data ?? []) as Club[];
  const { data: effectifs } = clubs.length ? await db.from("team_squad_counts").select("team_id, joueurs").in("team_id", clubs.map((x) => x.id)) : { data: [] };
  const nb = new Map<string, number>((effectifs ?? []).map((e) => [e.team_id as string, e.joueurs as number]));

  return (
    <div>
      <PageHeader titre="Clubs et sélections" description="Noms, logos, couleurs, stade, compétitions et effectif. Un logo envoyé ici n'est jamais remplacé par la synchro."
        actions={<Link href="/studio/clubs/nouveau" className="bouton-discret">Ajouter une équipe</Link>} />
      <Notice sp={sp} />
      <form method="get" role="search" className="flex flex-wrap items-end gap-2 mb-4">
        <label className="grid gap-1 text-sm font-semibold">Nom
          <input name="q" defaultValue={q} placeholder="Chercher" className="champ w-48" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Compétition
          <select name="comp" defaultValue={comp} className="champ">
            <option value="">Toutes</option>
            {(comps ?? []).map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Afficher
          <select name="f" defaultValue={filtre} className="champ">
            <option value="">Tout</option>
            <option value="sans-logo">Sans logo</option>
            <option value="sans-effectif">Clubs sans effectif</option>
            <option value="selections">Sélections</option>
          </select>
        </label>
        <button className="bouton-discret">Filtrer</button>
      </form>
      <p className="text-sm text-sourdine mb-2 tnum">{clubs.length} équipe{clubs.length > 1 ? "s" : ""}</p>
      <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-sourdine border-b border-trait text-left">
            <th scope="col" className="font-semibold px-4 py-2.5">Équipe</th>
            <th scope="col" className="font-semibold px-3">Pays</th>
            <th scope="col" className="font-semibold px-3 text-right">Joueurs</th>
            <th scope="col" className="font-semibold px-3">Effectif Wikipédia</th>
          </tr></thead>
          <tbody>
            {clubs.map((t) => (
              <tr key={t.id} className="border-b border-trait last:border-0 hover:bg-teinte/60">
                <th scope="row" className="text-left font-normal px-4 py-2">
                  <Link href={`/studio/clubs/${t.id}`} className="flex items-center gap-3 group">
                    <TeamBadge team={t} size="sm" />
                    <span className="font-semibold group-hover:underline underline-offset-4">{t.name}</span>
                    {t.is_national && <span className="text-[10px] font-bold rounded-full bg-teinte px-1.5 py-0.5">Sélection</span>}
                  </Link>
                </th>
                <td className="px-3 text-sourdine">{t.country ?? "–"}</td>
                <td className="px-3 text-right tnum">{nb.get(t.id) ?? 0}</td>
                <td className="px-3 text-sourdine">
                  {t.is_national ? "–" : t.wiki_title && (t.squad_count ?? 0) >= 12
                    ? <>lu {t.squad_synced_at ? fmtRelative(t.squad_synced_at) : ""}</>
                    : <span className="text-alerte font-semibold">introuvable</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

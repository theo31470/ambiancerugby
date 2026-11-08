/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { publicClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { POSITIONS, age } from "@/lib/format";

const PAR_PAGE = 60;
type Ligne = { id: string; first_name: string; last_name: string; position: string | null; nationality: string | null; birth_date: string | null; photo_url: string | null; verrou: boolean; in_squad: boolean; source: string; caps: number | null; team: { name: string } | null };

export default async function AdminJoueurs({ searchParams }: PageProps<"/admin/joueurs">) {
  const sp = await searchParams;
  const db = publicClient();
  const club = typeof sp.club === "string" ? sp.club : "";
  const q = typeof sp.q === "string" ? sp.q.trim().replace(/[%,()]/g, "") : "";
  const poste = typeof sp.poste === "string" ? sp.poste : "";
  const f = typeof sp.f === "string" ? sp.f : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { data: teams } = await db.from("teams").select("id,name").order("name");
  let req = db.from("players").select("id,first_name,last_name,position,nationality,birth_date,photo_url,verrou,in_squad,source,caps,team:teams(name)", { count: "exact" })
    .order("last_name").range((page - 1) * PAR_PAGE, page * PAR_PAGE - 1);
  if (club) req = req.eq("team_id", club);
  if (q) req = req.or(`last_name.ilike.%${q}%,first_name.ilike.%${q}%`);
  if (poste) req = req.eq("position", poste);
  if (f === "sans-photo") req = req.is("photo_url", null).eq("in_squad", true);
  else if (f === "verrouilles") req = req.eq("verrou", true);
  else if (f === "partis") req = req.eq("in_squad", false);
  else req = req.eq("in_squad", true);
  const { data, count } = await req;
  const joueurs = (data ?? []) as unknown as Ligne[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAR_PAGE));
  const lien = (p: number) => `/admin/joueurs?${new URLSearchParams({ ...(club && { club }), ...(q && { q }), ...(poste && { poste }), ...(f && { f }), page: String(p) })}`;

  return (
    <div>
      <PageHeader titre="Joueurs" description="Créés automatiquement depuis Wikipédia, complétés par TheSportsDB. Une fiche corrigée à la main est verrouillée : la synchro n'y touche plus."
        actions={<Link href={`/admin/joueurs/nouveau${club ? `?club=${club}` : ""}`} className="bouton-discret">Ajouter un joueur</Link>} />
      <Notice sp={sp} />
      <form className="flex flex-wrap items-end gap-2 mb-4" role="search">
        <label className="grid gap-1 text-sm font-semibold">Nom
          <input name="q" defaultValue={q} placeholder="Dupont" className="champ w-44" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Club
          <select name="club" defaultValue={club} className="champ max-w-xs">
            <option value="">Tous les clubs</option>
            {(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Poste
          <select name="poste" defaultValue={poste} className="champ">
            <option value="">Tous</option>
            {Object.entries(POSITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Afficher
          <select name="f" defaultValue={f} className="champ">
            <option value="">Effectifs actuels</option>
            <option value="sans-photo">Sans photo</option>
            <option value="verrouilles">Verrouillés</option>
            <option value="partis">Partis du club</option>
          </select>
        </label>
        <button className="bouton-discret">Filtrer</button>
      </form>
      <p className="text-sm text-sourdine mb-2 tnum">{count ?? 0} joueur{(count ?? 0) > 1 ? "s" : ""}{pages > 1 ? `, page ${page} sur ${pages}` : ""}</p>
      <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-sourdine border-b border-trait text-left">
            <th scope="col" className="font-semibold px-4 py-2.5">Joueur</th>
            <th scope="col" className="font-semibold px-3">Club</th>
            <th scope="col" className="font-semibold px-3">Poste</th>
            <th scope="col" className="font-semibold px-3">Nationalité</th>
            <th scope="col" className="font-semibold px-3 text-right">Âge</th>
            <th scope="col" className="font-semibold px-3 text-right">Sél.</th>
            <th scope="col" className="font-semibold px-3">Source</th>
          </tr></thead>
          <tbody>
            {joueurs.map((p) => (
              <tr key={p.id} className="border-b border-trait last:border-0 hover:bg-teinte/60">
                <th scope="row" className="text-left font-normal px-4 py-1.5">
                  <Link href={`/admin/joueurs/${p.id}`} className="flex items-center gap-3 group">
                    {p.photo_url ? <img src={p.photo_url} alt="" loading="lazy" className="w-8 h-8 rounded-full object-cover object-top bg-teinte" />
                      : <span className="w-8 h-8 rounded-full bg-teinte grid place-items-center text-xs font-bold text-vin">{p.last_name.slice(0, 1)}</span>}
                    <span className="font-semibold group-hover:underline underline-offset-4">{p.last_name.toUpperCase()} {p.first_name}</span>
                  </Link>
                </th>
                <td className="px-3 text-sourdine truncate max-w-[12rem]">{p.team?.name ?? "Sans club"}</td>
                <td className="px-3">{p.position ? POSITIONS[p.position] : "–"}</td>
                <td className="px-3 text-sourdine">{p.nationality ?? "–"}</td>
                <td className="px-3 text-right tnum">{age(p.birth_date) ?? "–"}</td>
                <td className="px-3 text-right tnum">{p.caps ?? "–"}</td>
                <td className="px-3 text-xs">
                  {p.verrou ? <span className="font-bold rounded-full bg-vin/10 text-vin px-2 py-0.5">Verrouillé</span> : <span className="text-sourdine">{p.source === "wikipedia" ? "Auto" : "Manuel"}</span>}
                  {!p.in_squad && <span className="ml-1 font-bold rounded-full bg-teinte px-2 py-0.5">Parti</span>}
                </td>
              </tr>
            ))}
            {!joueurs.length && <tr><td colSpan={7} className="px-4 py-6 text-sourdine">Aucun joueur ne correspond.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex gap-2">
          {page > 1 && <Link href={lien(page - 1)} className="bouton-discret">Précédent</Link>}
          {page < pages && <Link href={lien(page + 1)} className="bouton-discret">Suivant</Link>}
        </nav>
      )}
    </div>
  );
}

import Link from "next/link";
import type { TeamLite } from "@/lib/types";
import { publicClient } from "@/lib/supabase/server";
import { shopDb } from "@/lib/shop/admin";
import { lireCompositionLnr } from "@/lib/feuilles/lnr";
import { lireCompositionEspn, SELECT_MATCH_ESPN, type MatchLocal } from "@/lib/feuilles/espn";

const POSTES: Record<number, string> = {
  1: "Pilier gauche", 2: "Talonneur", 3: "Pilier droit", 4: "2e ligne", 5: "2e ligne", 6: "3e ligne aile", 7: "3e ligne aile", 8: "3e ligne centre",
  9: "Demi de mêlée", 10: "Demi d'ouverture", 11: "Ailier", 12: "Centre", 13: "Centre", 14: "Ailier", 15: "Arrière",
};

type Ligne = { team_id: string; numero?: number | null; starter?: boolean | null; tries?: number | null; yellow?: number | null; red?: number | null; entre?: boolean; player: { slug: string | null; first_name: string; last_name: string } };
type Annonce = { numero: number; cle: string; prenom: string; nom: string };

/** Les 23 annoncés (LNR ou ESPN) : sert à afficher tout le banc, même les remplaçants pas encore entrés. */
async function feuilleAnnoncee(matchId: string, lnrUrl: string | null): Promise<{ dom: Annonce[]; ext: Annonce[]; par: "lnr_id" | "espn_id" } | null> {
  if (lnrUrl) {
    const l = await lireCompositionLnr(lnrUrl).catch(() => null);
    const v = (x: NonNullable<typeof l>["dom"]) => x.map((j) => ({ numero: j.numero, cle: j.lnrId, prenom: j.prenom, nom: j.nom }));
    return l ? { dom: v(l.dom), ext: v(l.ext), par: "lnr_id" } : null;
  }
  const db = shopDb();
  const { data: ml } = await db.from("matches").select(SELECT_MATCH_ESPN).eq("id", matchId).maybeSingle();
  if (!ml || !(ml as unknown as MatchLocal).competition?.espn_league) return null;
  const e = await lireCompositionEspn(db, ml as unknown as MatchLocal).catch(() => null);
  const v = (x: NonNullable<typeof e>["dom"]) => x.map((j) => ({ numero: j.numero, cle: j.espnId, prenom: j.prenom, nom: j.nom }));
  return e ? { dom: v(e.dom), ext: v(e.ext), par: "espn_id" } : null;
}

const court = (p: Ligne["player"]) => `${p.first_name.slice(0, 1)}. ${p.last_name}`;

/** Compositions du match (pendant et après) : les 15 titulaires poste par poste, puis les remplaçants entrés. Visible par tous. */
export default async function Compositions({ matchId, lnrUrl, lignes, home, away, live }: { matchId: string; lnrUrl: string | null; lignes: Ligne[]; home: TeamLite; away: TeamLite; live: boolean }) {
  const de = (id: string) => lignes.filter((l) => l.team_id === id && l.numero != null);
  const h = de(home.id), a = de(away.id);
  if (h.length < 15 || a.length < 15) return null;
  const parNum = (l: Ligne[]) => new Map(l.map((x) => [Number(x.numero), x]));
  const H = parNum(h), A = parNum(a);
  // banc complet : les 23 annoncés, complétés par ceux déjà entrés en jeu
  const annonce = await feuilleAnnoncee(matchId, lnrUrl);
  const slugs = new Map<string, { slug: string; first_name: string; last_name: string }>();
  if (annonce) {
    const cles = [...annonce.dom, ...annonce.ext].filter((j) => j.numero > 15).map((j) => j.cle);
    if (cles.length) {
      const { data } = await publicClient().from("players").select(`slug,first_name,last_name,${annonce.par}`).in(annonce.par, cles);
      for (const p of (data ?? []) as unknown as Record<string, string>[]) slugs.set(p[annonce.par], { slug: p.slug, first_name: p.first_name, last_name: p.last_name });
    }
  }
  const remp = (l: Ligne[], teamId: string, ann?: Annonce[]) => {
    const parNumero = new Map(l.filter((x) => Number(x.numero) > 15).map((x) => [Number(x.numero), { ...x, entre: true }]));
    for (const j of ann ?? []) {
      if (j.numero <= 15 || parNumero.has(j.numero)) continue;
      const p = slugs.get(j.cle);
      parNumero.set(j.numero, { team_id: teamId, numero: j.numero, entre: false, player: p ?? { slug: null, first_name: j.prenom, last_name: j.nom } });
    }
    return [...parNumero.values()].sort((x, y) => Number(x.numero) - Number(y.numero));
  };
  const rh = remp(h, home.id, annonce?.dom), ra = remp(a, away.id, annonce?.ext);
  const nom = (t: TeamLite) => t.short_name ?? t.name;

  return (
    <section aria-labelledby="h-compos" className="mt-10 max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <h2 id="h-compos" className="groovy text-2xl text-vin">Les compositions</h2>
        <p className="text-sm text-sourdine">{live ? "En gras : les remplaçants déjà entrés en jeu" : "En gras : les remplaçants entrés en jeu"}</p>
      </div>
      <div className="bg-surface border border-trait rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 text-xs font-bold text-sourdine border-b border-trait">
          <span>{nom(home)}</span><span className="text-center">Poste</span><span className="text-right">{nom(away)}</span>
        </div>
        <ol>
          {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
            <li key={n} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 border-b border-trait last:border-0 text-sm">
              <Nom l={H.get(n)} />
              <span className="w-24 text-center text-xs text-sourdine leading-tight"><b className="block titre text-encre tnum">{n}</b>{POSTES[n]}</span>
              <Nom l={A.get(n)} droite />
            </li>
          ))}
        </ol>
        {(rh.length > 0 || ra.length > 0) && (
          <div className="grid grid-cols-2 gap-4 px-4 py-3 border-t border-trait text-sm">
            {[rh, ra].map((r, i) => (
              <div key={i} className={i ? "text-right" : ""}>
                <p className="text-xs font-bold text-sourdine mb-1">Remplaçants</p>
                <ul className="grid gap-1">
                  {r.map((x) => <li key={x.numero}><span className="tnum text-sourdine mr-1">{x.numero}</span><Nom l={x} inline /></li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Nom({ l, droite, inline }: { l?: Ligne; droite?: boolean; inline?: boolean }) {
  if (!l) return <span className={`text-sourdine ${droite ? "text-right" : ""}`}>–</span>;
  const marques = `${"🏉".repeat(Number(l.tries) || 0)}${"🟨".repeat(Number(l.yellow) || 0)}${"🟥".repeat(Number(l.red) || 0)}`;
  const classe = `${inline ? "" : "block truncate"} ${l.entre === false ? "font-normal text-sourdine" : "font-semibold"} hover:text-vin ${droite ? "text-right" : ""}`;
  const contenu = <>{court(l.player)}{marques && <span className="ml-1 text-xs">{marques}</span>}</>;
  return l.player.slug ? <Link href={`/joueurs/${l.player.slug}`} className={classe}>{contenu}</Link> : <span className={classe}>{contenu}</span>;
}

import TerrainCompo, { type EquipeCompo, type JoueurCompo } from "@/components/match/TerrainCompo";
import type { TeamLite } from "@/lib/types";
import { publicClient } from "@/lib/supabase/server";
import { shopDb } from "@/lib/shop/admin";
import { lireCompositionLnr } from "@/lib/feuilles/lnr";
import { lireCompositionEspn, SELECT_MATCH_ESPN, type MatchLocal } from "@/lib/feuilles/espn";


type Ligne = { team_id: string; numero?: number | null; starter?: boolean | null; tries?: number | null; yellow?: number | null; red?: number | null; minutes?: number | null; rating?: number | string | null; motm?: boolean | null; entre?: boolean; player: { slug: string | null; first_name: string; last_name: string; photo_url?: string | null } };
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
  const versCompo = (l: Ligne): JoueurCompo => {
    const infos: string[] = [];
    if (l.minutes) infos.push(`${l.minutes} min jouées`);
    if (l.tries) infos.push(`${l.tries} essai${Number(l.tries) > 1 ? "s" : ""}`);
    if (l.yellow) infos.push("Carton jaune");
    if (l.red) infos.push("Carton rouge");
    if (l.motm) infos.push("⭐ Homme du match");
    return {
      numero: Number(l.numero), prenom: l.player.first_name, nom: l.player.last_name, slug: l.player.slug, photo: l.player.photo_url ?? null,
      note: l.rating == null ? null : Number(l.rating), entre: l.entre, infos,
    };
  };
  const equipe = (t: TeamLite, tit: Map<number, Ligne>, remp: Ligne[]): EquipeCompo => ({
    nom: nom(t), titulaires: [...tit.values()].filter((l) => Number(l.numero) <= 15).map(versCompo), remplacants: remp.map(versCompo),
  });

  return (
    <section aria-label="Les compositions" className="mt-2">
      <TerrainCompo equipes={[equipe(home, H, rh), equipe(away, A, ra)]} titre="Les compositions"
        source={live ? "Les remplaçants entrés en jeu sont marqués 🔁. Passez sur un joueur pour sa fiche." : "Passez sur un joueur pour voir sa note et son match."} />
    </section>
  );
}

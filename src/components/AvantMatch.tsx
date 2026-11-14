import Link from "next/link";
import { publicClient } from "@/lib/supabase/server";
import { shopDb } from "@/lib/shop/admin";
import { lireCompositionLnr, trouverMatchLnr, type JoueurCompo } from "@/lib/feuilles/lnr";
import { lireCompositionEspn, SELECT_MATCH_ESPN, type MatchLocal } from "@/lib/feuilles/espn";
import type { TeamLite } from "@/lib/types";
import TerrainCompo, { type EquipeCompo as EquipeTerrain, type JoueurCompo as JoueurTerrain } from "@/components/match/TerrainCompo";

type Joueur = { id: string; slug: string | null; first_name: string; last_name: string; photo_url: string | null };
type Titulaire = { joueur: Joueur; note: number | null; matchs: number };
type Buteur = { joueur: Joueur; points: number; essais: number };

/** Titulaires habituels (numéro le plus porté sur les 5 derniers matchs) et buteurs en forme d'une équipe. */
async function profil(teamId: string) {
  const db = publicClient();
  const { data: ms } = await db.from("matches").select("id").eq("status", "finished").or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`).order("kickoff_at", { ascending: false }).limit(5);
  const ids = (ms ?? []).map((m) => m.id);
  if (!ids.length) return { titulaires: new Map<number, Titulaire>(), buteurs: [] as Buteur[], notes: new Map<string, number>() };
  const { data } = await db.from("player_match_stats")
    .select("numero, starter, rating, points, tries, player:players(id,slug,first_name,last_name,photo_url)")
    .in("match_id", ids).eq("team_id", teamId);
  const lignes = (data ?? []) as unknown as { numero: number | null; starter: boolean | null; rating: number | null; points: number | null; tries: number | null; player: Joueur }[];
  const parNumero = new Map<number, Map<string, { joueur: Joueur; n: number; notes: number[] }>>();
  const parJoueur = new Map<string, Buteur>();
  const notesJ = new Map<string, number[]>();
  for (const l of lignes) {
    if (l.rating != null) notesJ.set(l.player.id, [...(notesJ.get(l.player.id) ?? []), Number(l.rating)]);
    if (l.starter && l.numero && l.numero <= 15) {
      const m = parNumero.get(l.numero) ?? new Map();
      const e = m.get(l.player.id) ?? { joueur: l.player, n: 0, notes: [] };
      e.n++; if (l.rating != null) e.notes.push(Number(l.rating));
      m.set(l.player.id, e); parNumero.set(l.numero, m);
    }
    const b = parJoueur.get(l.player.id) ?? { joueur: l.player, points: 0, essais: 0 };
    b.points += l.points ?? 0; b.essais += l.tries ?? 0; parJoueur.set(l.player.id, b);
  }
  const titulaires = new Map<number, Titulaire>();
  const pris = new Set<string>();
  for (let n = 1; n <= 15; n++) {
    const c = [...(parNumero.get(n)?.values() ?? [])].filter((x) => !pris.has(x.joueur.id)).sort((a, b) => b.n - a.n)[0];
    if (!c) continue;
    pris.add(c.joueur.id);
    titulaires.set(n, { joueur: c.joueur, matchs: c.n, note: c.notes.length ? c.notes.reduce((s, x) => s + x, 0) / c.notes.length : null });
  }
  const buteurs = [...parJoueur.values()].filter((b) => b.points > 0).sort((a, b) => b.points - a.points).slice(0, 3);
  const notes = new Map([...notesJ.entries()].map(([id, n]) => [id, n.reduce((a, b) => a + b, 0) / n.length]));
  return { titulaires, buteurs, notes };
}

type MatchAvant = { id: string; kickoff_at: string; lnr_url?: string | null; round?: string | null; season?: string | null; competition_id: string };

type Banc = { numero: number; joueur: Joueur }[];
type Compo = { source: "LNR" | "ESPN"; dom: Map<number, Titulaire>; ext: Map<number, Titulaire>; bancDom: Banc; bancExt: Banc };

/** Composition officielle : feuille LNR (Top 14, Pro D2), sinon ESPN (autres compétitions), dans les 4 jours avant le match. */
async function compositionOfficielle(m: MatchAvant, home: TeamLite, away: TeamLite, notes: { h: Map<string, number>; a: Map<string, number> }): Promise<Compo | null> {
  if (new Date(m.kickoff_at).getTime() - Date.now() > 4 * 86400e3) return null;
  const db = shopDb();
  const { data: c } = await db.from("competitions").select("lnr_site, espn_league").eq("id", m.competition_id).maybeSingle();
  if (!c?.lnr_site) {
    if (!c?.espn_league) return null;
    const { data: ml } = await db.from("matches").select(SELECT_MATCH_ESPN).eq("id", m.id).maybeSingle();
    if (!ml) return null;
    const e = await lireCompositionEspn(db, ml as unknown as MatchLocal).catch(() => null);
    if (!e) return null;
    const { data } = await publicClient().from("players").select("id,slug,first_name,last_name,photo_url,espn_id").in("espn_id", [...e.dom, ...e.ext].map((j) => j.espnId));
    const parEspn = new Map((data ?? []).map((p) => [p.espn_id as string, p]));
    const vers = (l: typeof e.dom, n: Map<string, number>) => new Map(l.filter((j) => j.numero <= 15).map((j) => {
      const p = parEspn.get(j.espnId);
      const joueur: Joueur = p ? { id: p.id, slug: p.slug, first_name: p.first_name, last_name: p.last_name, photo_url: p.photo_url } : { id: j.espnId, slug: null, first_name: j.prenom, last_name: j.nom, photo_url: null };
      return [j.numero, { joueur, note: p ? n.get(p.id) ?? null : null, matchs: 0 }];
    }));
    const banc = (l: typeof e.dom): Banc => l.filter((j) => j.numero > 15).sort((x, y) => x.numero - y.numero).map((j) => {
      const p = parEspn.get(j.espnId);
      return { numero: j.numero, joueur: p ? { id: p.id, slug: p.slug, first_name: p.first_name, last_name: p.last_name, photo_url: p.photo_url } : { id: j.espnId, slug: null, first_name: j.prenom, last_name: j.nom, photo_url: null } };
    });
    return { source: "ESPN", dom: vers(e.dom, notes.h), ext: vers(e.ext, notes.a), bancDom: banc(e.dom), bancExt: banc(e.ext) };
  }
  let url = m.lnr_url ?? null;
  if (!url) {
    const { data: ts } = await db.from("teams").select("id,name,short_name,aliases").in("id", [home.id, away.id]);
    const t = (id: string) => ts?.find((x) => x.id === id);
    if (!t(home.id) || !t(away.id)) return null;
    url = await trouverMatchLnr(c.lnr_site, m.season ?? "", m.round ?? null, t(home.id) as never, t(away.id) as never).catch(() => null);
    if (url) await db.from("matches").update({ lnr_url: url }).eq("id", m.id);
  }
  if (!url) return null;
  const l = await lireCompositionLnr(url);
  if (!l) return null;
  const [d, x] = await Promise.all([versTitulaires(l.dom, notes.h), versTitulaires(l.ext, notes.a)]);
  return { source: "LNR", dom: d.tit, ext: x.tit, bancDom: d.banc, bancExt: x.banc };
}

async function versTitulaires(liste: JoueurCompo[], notes: Map<string, number>) {
  const { data } = await publicClient().from("players").select("id,slug,first_name,last_name,photo_url,lnr_id").in("lnr_id", liste.map((j) => j.lnrId));
  const parLnr = new Map((data ?? []).map((p) => [p.lnr_id as string, p]));
  const tit = new Map<number, Titulaire>();
  const banc: Banc = [];
  for (const j of liste) {
    const p = parLnr.get(j.lnrId);
    const joueur: Joueur = p ? { id: p.id, slug: p.slug, first_name: p.first_name, last_name: p.last_name, photo_url: p.photo_url } : { id: j.lnrId, slug: null, first_name: j.prenom, last_name: j.nom, photo_url: null };
    if (j.numero > 15) banc.push({ numero: j.numero, joueur });
    else tit.set(j.numero, { joueur, note: p ? notes.get(p.id) ?? null : null, matchs: 0 });
  }
  return { tit, banc: banc.sort((a, b) => a.numero - b.numero) };
}

const court = (j: Joueur) => `${j.first_name.slice(0, 1)}. ${j.last_name}`;

/** L'avant-match complet : duels poste par poste et buteurs en forme. Les Supporters voient tout. */
export default async function AvantMatch({ match, home, away, full }: { match: MatchAvant; home: TeamLite; away: TeamLite; full: boolean }) {
  const [h, a] = await Promise.all([profil(home.id), profil(away.id)]);
  const compo = await compositionOfficielle(match, home, away, { h: h.notes, a: a.notes }).catch(() => null);
  if (compo) { h.titulaires = compo.dom; a.titulaires = compo.ext; }
  const numeros = Array.from({ length: 15 }, (_, i) => i + 1).filter((n) => h.titulaires.has(n) || a.titulaires.has(n));
  if (numeros.length < 8) return null;
  const avantage = { h: 0, a: 0 };
  for (const n of numeros) {
    const x = h.titulaires.get(n)?.note, y = a.titulaires.get(n)?.note;
    if (x != null && y != null && Math.abs(x - y) >= 0.3) avantage[x > y ? "h" : "a"]++;
  }
  const nom = (t: TeamLite) => t.short_name ?? t.name;

  const versCompo = (n: number, t: Titulaire): JoueurTerrain => ({
    numero: n, prenom: t.joueur.first_name, nom: t.joueur.last_name, slug: t.joueur.slug, photo: t.joueur.photo_url,
    note: full ? t.note : null,
    infos: [
      ...(t.note != null && !full ? ["Note moyenne : réservée aux Supporters"] : t.note != null ? ["Note moyenne sur ses 5 derniers matchs"] : []),
      ...(t.matchs ? [`Titulaire à ce poste ${t.matchs} fois sur les 5 derniers matchs`] : []),
    ],
  });
  const equipe = (t: TeamLite, tit: Map<number, Titulaire>, banc: Banc): EquipeTerrain => ({
    nom: nom(t), titulaires: [...tit.entries()].map(([n, x]) => versCompo(n, x)),
    remplacants: banc.map((b) => ({ numero: b.numero, prenom: b.joueur.first_name, nom: b.joueur.last_name, slug: b.joueur.slug, photo: b.joueur.photo_url })),
  });

  return (
    <section aria-labelledby="h-avant" className="mt-10">
      <h2 id="h-avant" className="sr-only">L&apos;avant-match</h2>
      <TerrainCompo equipes={[equipe(home, h.titulaires, compo?.bancDom ?? []), equipe(away, a.titulaires, compo?.bancExt ?? [])]}
        titre={compo ? "Les compositions" : "Les XV probables"}
        source={compo ? `Composition officielle (${compo.source === "LNR" ? "feuille de match LNR" : "ESPN"}). Passez sur un joueur pour sa fiche.` : "Titulaires habituels sur les 5 derniers matchs ; la composition officielle s'affiche dès sa publication."} />
      {full ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
          {([[home, h.buteurs], [away, a.buteurs]] as const).map(([t, bs]) => (
            <div key={t.id} className="bg-surface border border-trait rounded-2xl p-4">
              <p className="text-xs font-bold text-sourdine">Buteurs en forme · {nom(t)}</p>
              <ul className="mt-2 grid gap-1.5 text-sm">
                {bs.length ? bs.map((b) => (
                  <li key={b.joueur.id} className="flex justify-between gap-2">
                    <Link href={`/joueurs/${b.joueur.slug ?? ""}`} className="font-semibold hover:text-vin truncate">{court(b.joueur)}</Link>
                    <span className="text-sourdine tnum shrink-0">{b.points} pts{b.essais ? ` · ${b.essais} essai${b.essais > 1 ? "s" : ""}` : ""}</span>
                  </li>
                )) : <li className="text-sourdine">Pas encore de données.</li>}
              </ul>
            </div>
          ))}
          <p className="sm:col-span-2 text-sm">
            Duels poste par poste (note moyenne) : <b>{nom(home)} {avantage.h}</b> – <b>{avantage.a} {nom(away)}</b>
            {avantage.h !== avantage.a && <> : avantage {avantage.h > avantage.a ? nom(home) : nom(away)} sur le papier.</>}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm">Notes moyennes des joueurs, duels poste par poste et buteurs en forme : réservés aux Supporters. <Link href="/abonnement" className="font-semibold text-vin underline underline-offset-4">Devenir Supporter</Link></p>
      )}
    </section>
  );
}

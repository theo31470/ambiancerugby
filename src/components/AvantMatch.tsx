/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { publicClient } from "@/lib/supabase/server";
import type { TeamLite } from "@/lib/types";

const POSTES: Record<number, string> = {
  1: "Pilier gauche", 2: "Talonneur", 3: "Pilier droit", 4: "2e ligne", 5: "2e ligne", 6: "3e ligne aile", 7: "3e ligne aile", 8: "3e ligne centre",
  9: "Demi de mêlée", 10: "Demi d'ouverture", 11: "Ailier", 12: "Centre", 13: "Centre", 14: "Ailier", 15: "Arrière",
};
type Joueur = { id: string; slug: string; first_name: string; last_name: string; photo_url: string | null };
type Titulaire = { joueur: Joueur; note: number | null; matchs: number };
type Buteur = { joueur: Joueur; points: number; essais: number };

/** Titulaires habituels (numéro le plus porté sur les 5 derniers matchs) et buteurs en forme d'une équipe. */
async function profil(teamId: string) {
  const db = publicClient();
  const { data: ms } = await db.from("matches").select("id").eq("status", "finished").or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`).order("kickoff_at", { ascending: false }).limit(5);
  const ids = (ms ?? []).map((m) => m.id);
  if (!ids.length) return { titulaires: new Map<number, Titulaire>(), buteurs: [] as Buteur[] };
  const { data } = await db.from("player_match_stats")
    .select("numero, starter, rating, points, tries, player:players(id,slug,first_name,last_name,photo_url)")
    .in("match_id", ids).eq("team_id", teamId);
  const lignes = (data ?? []) as unknown as { numero: number | null; starter: boolean | null; rating: number | null; points: number | null; tries: number | null; player: Joueur }[];
  const parNumero = new Map<number, Map<string, { joueur: Joueur; n: number; notes: number[] }>>();
  const parJoueur = new Map<string, Buteur>();
  for (const l of lignes) {
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
  return { titulaires, buteurs };
}

const court = (j: Joueur) => `${j.first_name.slice(0, 1)}. ${j.last_name}`;

/** L'avant-match complet : duels poste par poste et buteurs en forme. Les Supporters voient tout. */
export default async function AvantMatch({ home, away, full }: { home: TeamLite; away: TeamLite; full: boolean }) {
  const [h, a] = await Promise.all([profil(home.id), profil(away.id)]);
  const numeros = Array.from({ length: 15 }, (_, i) => i + 1).filter((n) => h.titulaires.has(n) || a.titulaires.has(n));
  if (numeros.length < 8) return null;
  const visibles = full ? numeros : numeros.slice(0, 3);
  const avantage = { h: 0, a: 0 };
  for (const n of numeros) {
    const x = h.titulaires.get(n)?.note, y = a.titulaires.get(n)?.note;
    if (x != null && y != null && Math.abs(x - y) >= 0.3) avantage[x > y ? "h" : "a"]++;
  }
  const nom = (t: TeamLite) => t.short_name ?? t.name;

  return (
    <section aria-labelledby="h-avant" className="mt-10 max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <h2 id="h-avant" className="groovy text-2xl text-vin">L&apos;avant-match</h2>
        <p className="text-sm text-sourdine">Titulaires habituels sur les 5 derniers matchs, note moyenne sur 10</p>
      </div>
      <div className="bg-surface border border-trait rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 text-xs font-bold text-sourdine border-b border-trait">
          <span>{nom(home)}</span><span className="text-center">Duels</span><span className="text-right">{nom(away)}</span>
        </div>
        <ol className="relative">
          {visibles.map((n) => {
            const x = h.titulaires.get(n), y = a.titulaires.get(n);
            const gagneH = x?.note != null && y?.note != null && x.note - y.note >= 0.3;
            const gagneA = x?.note != null && y?.note != null && y.note - x.note >= 0.3;
            return (
              <li key={n} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 border-b border-trait last:border-0 text-sm">
                <Joueur t={x} gagne={gagneH} />
                <span className="w-24 text-center text-xs text-sourdine leading-tight"><b className="block titre text-encre tnum">{n}</b>{POSTES[n]}</span>
                <Joueur t={y} gagne={gagneA} droite />
              </li>
            );
          })}
        </ol>
        {!full && (
          <div className="relative border-t border-trait">
            <div aria-hidden className="blur-sm select-none pointer-events-none opacity-60 px-4 py-3 grid gap-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-6 rounded bg-teinte" />)}
            </div>
            <div className="absolute inset-0 grid place-items-center text-center px-4">
              <p className="text-sm font-semibold">Les 15 duels, les buteurs en forme et le bilan sont réservés aux Supporters. <Link href="/abonnement" className="text-vin underline underline-offset-4">Devenir Supporter</Link></p>
            </div>
          </div>
        )}
      </div>
      {full && (
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
          {([[home, h.buteurs], [away, a.buteurs]] as const).map(([t, bs]) => (
            <div key={t.id} className="bg-surface border border-trait rounded-2xl p-4">
              <p className="text-xs font-bold text-sourdine">Buteurs en forme · {nom(t)}</p>
              <ul className="mt-2 grid gap-1.5 text-sm">
                {bs.length ? bs.map((b) => (
                  <li key={b.joueur.id} className="flex justify-between gap-2">
                    <Link href={`/joueurs/${b.joueur.slug}`} className="font-semibold hover:text-vin truncate">{court(b.joueur)}</Link>
                    <span className="text-sourdine tnum shrink-0">{b.points} pts{b.essais ? ` · ${b.essais} essai${b.essais > 1 ? "s" : ""}` : ""}</span>
                  </li>
                )) : <li className="text-sourdine">Pas encore de données.</li>}
              </ul>
            </div>
          ))}
          <p className="sm:col-span-2 text-sm">
            Bilan des duels : <b>{nom(home)} {avantage.h}</b> – <b>{avantage.a} {nom(away)}</b>
            {avantage.h !== avantage.a && <> : avantage {avantage.h > avantage.a ? nom(home) : nom(away)} sur le papier.</>}
          </p>
        </div>
      )}
    </section>
  );
}

function Joueur({ t, gagne, droite }: { t?: Titulaire; gagne: boolean; droite?: boolean }) {
  if (!t) return <span className={`text-sourdine ${droite ? "text-right" : ""}`}>–</span>;
  return (
    <Link href={`/joueurs/${t.joueur.slug}`} className={`flex items-center gap-2 min-w-0 hover:text-vin ${droite ? "flex-row-reverse text-right" : ""}`}>
      {t.joueur.photo_url
        ? <img src={t.joueur.photo_url} alt="" loading="lazy" className="w-8 h-8 rounded-full object-cover object-top bg-teinte shrink-0" />
        : <span className="w-8 h-8 rounded-full bg-teinte shrink-0" aria-hidden />}
      <span className="min-w-0">
        <span className={`block truncate ${gagne ? "font-bold" : "font-semibold"}`}>{court(t.joueur)}</span>
        {t.note != null && <span className={`text-xs tnum ${gagne ? "text-ok font-bold" : "text-sourdine"}`}>{t.note.toFixed(1)}/10{gagne ? " ▲" : ""}</span>}
      </span>
    </Link>
  );
}

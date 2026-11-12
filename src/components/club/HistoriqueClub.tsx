import Link from "next/link";
import TeamBadge from "@/components/TeamBadge";
import { publicClient } from "@/lib/supabase/server";
import { TEAM_LITE } from "@/lib/queries";
import { urlMatch } from "@/lib/seo";
import type { TeamLite } from "@/lib/types";

type M = { id: string; kickoff_at: string; season: string; home_score: number; away_score: number; home_team_id: string; away_team_id: string; home: TeamLite; away: TeamLite; competition: { slug: string; short_name: string | null; name: string; kind: string } };
type S = { season: string; rank: number; points: number; played: number; pool: string | null; competition_id: string; competition: { slug: string; short_name: string | null; name: string; kind: string } };
type Bilan = { v: number; n: number; d: number; pour: number; contre: number };
const vide = (): Bilan => ({ v: 0, n: 0, d: 0, pour: 0, contre: 0 });
const nom = (t: { short_name: string | null; name: string }) => t.short_name ?? t.name;
const pct = (b: Bilan) => Math.round((100 * (b.v + b.n / 2)) / Math.max(1, b.v + b.n + b.d));

/** Le club sur cinq saisons : classements, bilan domicile / extérieur, adversaire préféré et bête noire. */
export default async function HistoriqueClub({ teamId }: { teamId: string }) {
  const db = publicClient();
  const matchs: M[] = [];
  for (let de = 0; de < 5000; de += 1000) {
    const { data } = await db.from("matches")
      .select(`id,kickoff_at,season,home_score,away_score,home_team_id,away_team_id, home:teams!matches_home_team_id_fkey(${TEAM_LITE}), away:teams!matches_away_team_id_fkey(${TEAM_LITE}), competition:competitions(slug,short_name,name,kind)`)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`).eq("status", "finished")
      .not("home_score", "is", null).not("away_score", "is", null).order("kickoff_at").range(de, de + 999);
    matchs.push(...((data ?? []) as unknown as M[]));
    if (!data || data.length < 1000) break;
  }
  if (matchs.length < 10) return null;
  const { data: st } = await db.from("standings").select("season,rank,points,played,pool,competition_id, competition:competitions(slug,short_name,name,kind)").eq("team_id", teamId);
  const classements = ((st ?? []) as unknown as S[]).filter((s) => s.played >= 5);
  // nombre d'équipes de chaque classement (même compétition, saison et poule)
  const cles = [...new Set(classements.map((s) => s.competition_id))];
  const { data: tailles } = cles.length ? await db.from("standings").select("competition_id,season,pool").in("competition_id", cles).limit(5000) : { data: [] };
  const taille = new Map<string, number>();
  for (const t of tailles ?? []) { const k = `${t.competition_id}|${t.season}|${t.pool ?? ""}`; taille.set(k, (taille.get(k) ?? 0) + 1); }

  const dom = vide(), ext = vide();
  const adv = new Map<string, { team: TeamLite; b: Bilan }>();
  let large: { m: M; ecart: number } | null = null, lourde: { m: M; ecart: number } | null = null;
  for (const m of matchs) {
    const chezNous = m.home_team_id === teamId;
    const pour = chezNous ? m.home_score : m.away_score, contre = chezNous ? m.away_score : m.home_score;
    const b = chezNous ? dom : ext;
    const adversaire = chezNous ? m.away : m.home;
    const a = adv.get(adversaire.id) ?? { team: adversaire, b: vide() };
    for (const x of [b, a.b]) { x.pour += pour; x.contre += contre; if (pour > contre) x.v++; else if (pour === contre) x.n++; else x.d++; }
    adv.set(adversaire.id, a);
    const ecart = pour - contre;
    if (ecart > 0 && (!large || ecart > large.ecart)) large = { m, ecart };
    if (ecart < 0 && (!lourde || -ecart > lourde.ecart)) lourde = { m, ecart: -ecart };
  }
  const reguliers = [...adv.values()].filter((a) => a.b.v + a.b.n + a.b.d >= 4);
  const prefere = [...reguliers].sort((x, y) => pct(y.b) - pct(x.b) || (y.b.pour - y.b.contre) - (x.b.pour - x.b.contre))[0];
  const bete = [...reguliers].sort((x, y) => pct(x.b) - pct(y.b) || (x.b.pour - x.b.contre) - (y.b.pour - y.b.contre))[0];

  // parcours en championnat, saison après saison
  const parcours = classements.filter((s) => s.competition.kind === "league").sort((a, b) => a.season.localeCompare(b.season));
  const saisons = [...new Set(matchs.map((m) => m.season))];
  const premiere = saisons.sort()[0];

  const ligneBilan = (titre: string, b: Bilan) => {
    const j = b.v + b.n + b.d;
    return (
      <div className="bg-surface border border-trait rounded-2xl p-4">
        <p className="text-sm text-sourdine">{titre}</p>
        <p className="mt-1 flex items-baseline gap-2"><span className="groovy text-4xl text-vin tnum">{pct(b)} %</span><span className="text-sm text-sourdine">de réussite</span></p>
        <div className="mt-3 flex h-2.5 rounded-full overflow-hidden bg-teinte" aria-hidden>
          <span className="bg-vin" style={{ width: `${(100 * b.v) / j}%` }} /><span className="bg-sourdine/40" style={{ width: `${(100 * b.n) / j}%` }} /><span className="bg-moutarde" style={{ width: `${(100 * b.d) / j}%` }} />
        </div>
        <p className="mt-2 text-sm tnum">{b.v} victoires, {b.n} nul{b.n > 1 ? "s" : ""}, {b.d} défaites</p>
        <p className="text-xs text-sourdine tnum">{(b.pour / j).toFixed(1).replace(".", ",")} points marqués et {(b.contre / j).toFixed(1).replace(".", ",")} encaissés par match</p>
      </div>
    );
  };
  const carteAdv = (titre: string, a: { team: TeamLite; b: Bilan } | undefined, phrase: string) => a && (
    <Link href={`/clubs/${a.team.slug}`} className="bg-surface border border-trait rounded-2xl p-4 hover:border-vin block">
      <p className="text-sm text-sourdine">{titre}</p>
      <p className="mt-2 flex items-center gap-2 font-bold text-lg"><TeamBadge team={a.team} />{nom(a.team)}</p>
      <p className="mt-1 text-sm tnum">{a.b.v} V, {a.b.n} N, {a.b.d} D en {a.b.v + a.b.n + a.b.d} matchs</p>
      <p className="text-xs text-sourdine">{phrase}</p>
    </Link>
  );

  return (
    <section aria-labelledby="h-histoire" className="mt-10">
      <h2 id="h-histoire" className="text-xl font-bold">Son histoire récente</h2>
      <p className="text-sm text-sourdine mb-4">Depuis {premiere}, sur {matchs.length} matchs suivis par Ambiance Rugby, toutes compétitions.</p>

      {parcours.length > 1 && (
        <ol className="mb-5 flex flex-wrap gap-2">
          {parcours.map((s) => {
            const n = taille.get(`${s.competition_id}|${s.season}|${s.pool ?? ""}`);
            return (
              <li key={s.competition.slug + s.season}>
                <Link href={`/competitions/${s.competition.slug}?vue=classement&saison=${s.season}`} className="flex flex-col items-center rounded-2xl border border-trait bg-surface px-4 py-2 min-w-24 hover:border-vin">
                  <span className="text-xs text-sourdine tnum">{s.season}</span>
                  <span className={`groovy text-3xl tnum ${s.rank === 1 ? "text-moutarde" : "text-vin"}`}>{s.rank}<sup className="text-base">e</sup></span>
                  <span className="text-xs text-sourdine">{s.competition.short_name ?? s.competition.name}{n ? ` · ${n} équipes` : ""}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ligneBilan("À domicile", dom)}
        {ligneBilan("À l'extérieur", ext)}
        {carteAdv("Adversaire préféré", prefere, "au moins 4 confrontations")}
        {bete && bete.team.id !== prefere?.team.id && carteAdv("Bête noire", bete, "au moins 4 confrontations")}
      </div>

      {(large || lourde) && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
          {large && <li><Link href={urlMatch(large.m)} className="block rounded-xl bg-teinte/60 px-4 py-2.5 hover:bg-teinte">Plus large victoire : <b className="tnum">+{large.ecart}</b>, {nom(large.m.home)} {large.m.home_score}-{large.m.away_score} {nom(large.m.away)} <span className="text-sourdine">({large.m.competition.short_name ?? large.m.competition.name}, {large.m.season})</span></Link></li>}
          {lourde && <li><Link href={urlMatch(lourde.m)} className="block rounded-xl bg-teinte/60 px-4 py-2.5 hover:bg-teinte">Plus lourde défaite : <b className="tnum">-{lourde.ecart}</b>, {nom(lourde.m.home)} {lourde.m.home_score}-{lourde.m.away_score} {nom(lourde.m.away)} <span className="text-sourdine">({lourde.m.competition.short_name ?? lourde.m.competition.name}, {lourde.m.season})</span></Link></li>}
        </ul>
      )}
    </section>
  );
}

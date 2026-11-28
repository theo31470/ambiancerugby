import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import LiveRefresh from "@/components/LiveRefresh";
import FilDuMatch from "@/components/FilDuMatch";
import CourbeAscendant from "@/components/CourbeAscendant";
import CarteTerrain from "@/components/CarteTerrain";
import type { ActionTerrain } from "@/lib/terrain";
import { absolue, filAriane, jsonLd, ORGANISATION, urlMatch } from "@/lib/seo";
import Pronostic from "@/components/pronos/Pronostic";
import AvantMatch from "@/components/AvantMatch";
import Compositions from "@/components/Compositions";
import Onglets from "@/components/match/Onglets";
import ActionsMatch from "@/components/match/ActionsMatch";
import ScoreAnime from "@/components/match/ScoreAnime";
import CompteARebours from "@/components/match/CompteARebours";
import ChiffresEquipes, { type LigneChiffre } from "@/components/match/ChiffresEquipes";
import StatsJoueurs, { type JoueurMatch } from "@/components/match/StatsJoueurs";
import HommeDuMatch, { type Hdm } from "@/components/match/HommeDuMatch";
import { after } from "next/server";
import { shopDb } from "@/lib/shop/admin";
import { completerAvantMatch, SELECT_MATCH_WR, type MatchWr } from "@/lib/feuilles/worldrugby";
import { createClient } from "@/lib/supabase/server";
import ChronoLive, { type Periodes } from "@/components/ChronoLive";
import Comments from "@/components/Comments";
import Confrontations from "@/components/stats/Confrontations";
import Prono from "@/components/algo/Prono";
import TribuneLive from "@/components/deco/TribuneLive";
import Forme from "@/components/algo/Forme";
import { getMatch } from "@/lib/queries";
import { getForms, getRatings, pronostic } from "@/lib/algo";
import { getViewer, publicClient } from "@/lib/supabase/server";
import { STATUS_LABEL, fmtDay, fmtTime, isLive, libelleTour, minuteDirect } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/matchs/[id]">): Promise<Metadata> {
  const m = await getMatch((await params).id);
  if (!m) return {};
  const fini = m.status === "finished" && m.home_score != null;
  const enDirect = isLive(m.status);
  const jour = fmtDay(m.kickoff_at, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const affiche = `${m.home.name} – ${m.away.name}`;
  const title = fini ? `${m.home.name} ${m.home_score}-${m.away_score} ${m.away.name} : résumé, notes et stats (${m.competition.short_name ?? m.competition.name})`
    : enDirect ? `${affiche} en direct : score et fil du match (${m.competition.short_name ?? m.competition.name})`
    : `${affiche} : compositions, pronostic et avant-match (${m.competition.short_name ?? m.competition.name})`;
  const description = fini
    ? `${m.competition.name}, ${jour} : ${m.home.name} ${m.home_score}-${m.away_score} ${m.away.name}. Fil du match, courbe d'ascendant, notes des joueurs et stats complètes.`
    : `${m.competition.name}, ${jour} à ${fmtTime(m.kickoff_at)} : ${affiche}. Pronostic de l'algorithme, compositions, duels poste par poste et score en direct.`;
  const url = urlMatch(m);
  return { title: { absolute: `${title} · Ambiance Rugby` }, description, alternates: { canonical: url }, openGraph: { type: "article", url, title, description } };
}

export default async function MatchPage({ params }: PageProps<"/matchs/[id]">) {
  const { id } = await params;
  const m = await getMatch(id);
  if (!m) notFound();
  // une seule adresse par match : l'adresse lisible (les anciens liens par identifiant y sont redirigés)
  const canonique = urlMatch(m);
  if (`/matchs/${decodeURIComponent(id)}` !== canonique) permanentRedirect(canonique);

  const { data: events } = await publicClient()
    .from("match_events")
    .select("id,minute,kind,text,team_id, player:players(slug,first_name,last_name)")
    .eq("match_id", m.id)
    .order("minute", { ascending: true, nullsFirst: true })
    .order("created_at");

  const live = isLive(m.status);
  // En direct, la feuille officielle (LNR, World Rugby) publie les faits de jeu avec plusieurs minutes de retard sur
  // le score. Les points déjà marqués mais pas encore détaillés apparaissent dans le fil, en provisoire.
  const filComplet = [...(events ?? [])] as Record<string, unknown>[];
  if (live) {
    const { data: actions } = await shopDb().from("notif_actions").select("id,team_id,avant,apres,detectee_le").eq("match_id", m.id).order("detectee_le");
    const PTS: Record<string, number> = { try: 5, penalty_try: 7, conversion: 2, penalty: 3, drop: 3 };
    const auFil = (team: string) => (events ?? []).filter((e) => e.team_id === team).reduce((n, e) => n + (PTS[e.kind as string] ?? 0), 0);
    const deja: Record<string, number> = { [m.home_team_id]: auFil(m.home_team_id), [m.away_team_id]: auFil(m.away_team_id) };
    const p = m as { periode1_debut?: string | null; periode2_debut?: string | null };
    const minuteDe = (iso: string) => {
      const t = new Date(iso).getTime();
      // l'action a été vue avec ~2 minutes de retard sur le terrain
      if (p.periode2_debut && t > new Date(p.periode2_debut).getTime()) return Math.min(80, 40 + Math.max(0, Math.round((t - new Date(p.periode2_debut).getTime()) / 60000) - 2));
      if (p.periode1_debut) return Math.min(40, Math.max(1, Math.round((t - new Date(p.periode1_debut).getTime()) / 60000) - 2));
      return null;
    };
    for (const a of actions ?? []) {
      if (a.apres <= (deja[a.team_id] ?? 0)) continue;
      const reste = a.apres - Math.max(a.avant, deja[a.team_id] ?? 0);
      const kinds = reste === 7 ? ["try", "conversion"] : reste === 5 ? ["try"] : reste === 3 ? ["penalty"] : reste === 2 ? ["conversion"] : [];
      kinds.forEach((kind, i) => filComplet.push({ id: `provisoire-${a.id}-${i}`, minute: minuteDe(a.detectee_le), kind, text: null, team_id: a.team_id, player: null, provisoire: true }));
      deja[a.team_id] = a.apres;
    }
  }
  // lieu du match pour Google (champ obligatoire) : stade connu, sinon stade ou ville du club qui reçoit
  const { data: recevant } = await publicClient().from("teams").select("stadium,city,country").eq("id", m.home_team_id).maybeSingle();
  const stadeVille = (m as { stade_ville?: string | null }).stade_ville ?? null;
  const ville = stadeVille ?? recevant?.city ?? null;
  const lieu = {
    "@type": "Place",
    name: m.venue ?? recevant?.stadium ?? (ville ? `Stade de ${ville}` : `Stade de ${m.home.name}`),
    address: { "@type": "PostalAddress", ...(ville ? { addressLocality: ville } : {}), ...(recevant?.country ? { addressCountry: recevant.country } : {}), ...(!ville && !recevant?.country ? { name: m.home.name } : {}) },
  };
  const { data: amb } = await publicClient().from("match_ambiance").select("team_id,cris").eq("match_id", m.id);
  const totauxTribune = { h: amb?.find((a) => a.team_id === m.home_team_id)?.cris ?? 0, a: amb?.find((a) => a.team_id === m.away_team_id)?.cris ?? 0 };
  const showScore = live || m.status === "finished";
  const linescores = Array.isArray(m.linescores) ? (m.linescores as { home: number; away: number }[]) : null;

  // l'avis de l'algorithme
  const ids = [m.home_team_id, m.away_team_id];
  const [ratings, forms, viewer, { data: hist }, { data: stats }] = await Promise.all([
    getRatings(ids),
    getForms(ids),
    getViewer(),
    publicClient().from("rating_history").select("team_id,delta,rating").eq("match_id", m.id),
    publicClient().from("player_match_stats").select("*, player:players(slug,first_name,last_name,position,photo_url)").eq("match_id", m.id).order("rating", { ascending: false, nullsFirst: false }),
  ]);
  const prono = m.status === "finished" ? null : pronostic(ratings.get(m.home_team_id)?.rating, ratings.get(m.away_team_id)?.rating);
  const deltaOf = (teamId: string) => (hist ?? []).find((h) => h.team_id === teamId)?.delta as number | undefined;
  const notes = (stats ?? []) as unknown as (Record<string, number | boolean | string> & { player_id: string; team_id: string; rating: number; motm: boolean; player: { slug: string; first_name: string; last_name: string; position: string | null } })[];
  const full = !!viewer?.supporter;
  const { data: terrainRow } = m.status === "finished" || live
    ? await publicClient().from("match_terrain").select("evenements").eq("match_id", m.id).maybeSingle()
    : { data: null };
  const terrain = (terrainRow?.evenements as ActionTerrain[] | undefined) ?? null;
  const [{ data: moyennes }, mesVotes] = await Promise.all([
    publicClient().from("player_votes_moyennes").select("player_id,note,votes").eq("match_id", m.id),
    viewer?.supporter && m.status === "finished"
      ? (await createClient()).from("player_votes").select("player_id,note").eq("match_id", m.id).eq("user_id", viewer.id).then(({ data }) => new Map((data ?? []).map((x) => [x.player_id, x.note as number])))
      : Promise.resolve(new Map<string, number>()),
  ]);
  const noteSup = new Map((moyennes ?? []).map((x) => [x.player_id as string, { note: Number(x.note), votes: Number(x.votes) }]));
  const hommeSup = [...noteSup.entries()].filter(([, v]) => v.votes >= 3).sort((a, b) => b[1].note - a[1].note)[0];
  const monProno = viewer && m.status === "scheduled"
    ? await (await createClient()).from("pronos").select("home_score,away_score").eq("user_id", viewer.id).eq("match_id", m.id).maybeSingle().then(({ data }) => (data ? { h: data.home_score, a: data.away_score } : null))
    : null;
  const hn = m.home.short_name ?? m.home.name;
  const an = m.away.short_name ?? m.away.name;

  const fini = m.status === "finished";
  const avant = !live && !fini;
  // joueurs du match (tableau par thème) et totaux d'équipe
  const STATS = ["minutes", "tries", "points", "tackles", "missed_tackles", "carries", "metres", "line_breaks", "defenders_beaten", "offloads", "try_assists", "passes",
    "dominant_tackles", "turnovers_won", "lineouts_stolen", "lineouts_won", "kicks", "kick_metres", "penalties_conceded", "turnovers_conceded", "handling_errors", "yellow", "red"];
  const joueurs: JoueurMatch[] = notes.map((x) => ({
    id: x.player_id, slug: x.player.slug, prenom: x.player.first_name, nom: x.player.last_name, cote: x.team_id === m.home_team_id ? "h" : "a",
    numero: (x.numero as number | null) ?? null, titulaire: !!x.starter, note: x.rating == null ? null : Number(x.rating), hdm: !!x.motm,
    sup: noteSup.get(x.player_id) ?? null, monVote: mesVotes.get(x.player_id) ?? null,
    s: Object.fromEntries(STATS.map((k) => [k, Number(x[k]) || 0])),
  }));
  const somme = (cote: "h" | "a", k: string) => joueurs.filter((j) => j.cote === cote).reduce((t, j) => t + (j.s[k] ?? 0), 0);
  const reussite = (cote: "h" | "a") => { const t = somme(cote, "tackles"), mq = somme(cote, "missed_tackles"); return t + mq ? Math.round((100 * t) / (t + mq)) : 0; };
  const chiffres: LigneChiffre[] = [
    { label: "Essais", h: m.home_tries ?? somme("h", "tries"), a: m.away_tries ?? somme("a", "tries") },
    { label: "Mètres gagnés", h: somme("h", "metres"), a: somme("a", "metres") },
    { label: "Courses", h: somme("h", "carries"), a: somme("a", "carries") },
    { label: "Franchissements", h: somme("h", "line_breaks"), a: somme("a", "line_breaks") },
    { label: "Défenseurs battus", h: somme("h", "defenders_beaten"), a: somme("a", "defenders_beaten") },
    { label: "Passes après contact", h: somme("h", "offloads"), a: somme("a", "offloads") },
    { label: "Plaquages réussis", h: somme("h", "tackles"), a: somme("a", "tackles") },
    { label: "Réussite au plaquage", h: reussite("h"), a: reussite("a"), suffixe: " %" },
    { label: "Ballons grattés", h: somme("h", "turnovers_won"), a: somme("a", "turnovers_won") },
    { label: "Mètres au pied", h: somme("h", "kick_metres"), a: somme("a", "kick_metres") },
    { label: "Pénalités concédées", h: somme("h", "penalties_conceded"), a: somme("a", "penalties_conceded"), moinsMieux: true },
    { label: "Ballons perdus", h: somme("h", "turnovers_conceded"), a: somme("a", "turnovers_conceded"), moinsMieux: true },
    { label: "Cartons", h: somme("h", "yellow") + somme("h", "red"), a: somme("a", "yellow") + somme("a", "red"), moinsMieux: true },
  ];
  const motm = notes.find((x) => x.motm);
  const { data: photoHdm } = motm ? await publicClient().from("players").select("photo_url").eq("id", motm.player_id).maybeSingle() : { data: null };
  const hdm: Hdm | null = fini && motm ? {
    joueur: { ...motm.player, photo_url: (photoHdm?.photo_url as string | null) ?? null }, equipe: motm.team_id === m.home_team_id ? (m.home.short_name ?? m.home.name) : (m.away.short_name ?? m.away.name),
    note: motm.rating == null ? null : Number(motm.rating), s: Object.fromEntries(STATS.map((k) => [k, Number(motm[k]) || 0])), officiel: !!(m as { homme_du_match?: string | null }).homme_du_match,
  } : null;
  const supHdm = hommeSup ? (() => { const j = notes.find((x) => x.player_id === hommeSup[0]); return j ? { joueur: j.player, note: hommeSup[1].note, votes: hommeSup[1].votes } : null; })() : null;
  // arbitre et stade : demandés à World Rugby en arrière-plan dans les jours qui précèdent le match
  const mx = m as unknown as { arbitre?: string | null; arbitre_pays?: string | null; stade_ville?: string | null; officiels_at?: string | null; wr_id?: string | null };
  const avantProche = avant && depuis(m.kickoff_at) > -6 * 86400e3;
  if (avantProche && (!mx.officiels_at || depuis(mx.officiels_at) > 12 * 3600e3)) {
    after(async () => {
      const db = shopDb();
      const { data: mw } = await db.from("matches").select(SELECT_MATCH_WR).eq("id", m.id).single();
      if (mw) await completerAvantMatch(db, mw as unknown as MatchWr).catch(() => null);
    });
  }
  const infos: [string, string, React.ReactNode][] = [
    ["🗓️", "Coup d'envoi", <span key="d"><span className="first-letter:uppercase inline-block">{fmtDay(m.kickoff_at)}</span>, {fmtTime(m.kickoff_at)}</span>],
    ["🏟️", "Stade", m.venue ? `${m.venue}${mx.stade_ville ? `, ${mx.stade_ville}` : ""}` : <span key="s" className="text-sourdine font-normal">Non communiqué</span>],
    ["🧑‍⚖️", "Arbitre", mx.arbitre ? `${mx.arbitre}${mx.arbitre_pays ? ` (${mx.arbitre_pays})` : ""}` : <span key="a" className="text-sourdine font-normal">{avant ? "Pas encore désigné" : "Non communiqué"}</span>],
    ["📺", "Diffusion", m.tv ?? <span key="t" className="text-sourdine font-normal">Non communiquée</span>],
  ];
  const minute = m.status === "finished" ? 80 : m.status === "halftime" ? 40 : Math.min(80, Math.max(0, ...(events ?? []).map((e) => e.minute ?? 0), m.clock && /^\d+/.test(m.clock) ? parseInt(m.clock, 10) : 0));
  // score compact, affiché dans la barre d'onglets quand le grand tableau sort de l'écran
  const scoreCompact = (
    <div className="flex items-center justify-center gap-3 pt-2 pb-1 text-sm font-semibold">
      <span className="flex items-center gap-2 min-w-0 justify-end flex-1"><span className="truncate">{m.home.short_name ?? m.home.name}</span><TeamBadge team={m.home} /></span>
      <span className={`titre font-extrabold text-lg tnum rounded-lg px-2.5 py-0.5 ${live ? "bg-bordeaux text-moutarde" : "bg-teinte"}`}>{m.home_score ?? 0}–{m.away_score ?? 0}</span>
      <span className="flex items-center gap-2 min-w-0 flex-1"><TeamBadge team={m.away} /><span className="truncate">{m.away.short_name ?? m.away.name}</span></span>
      {live && <span className="inline-flex items-center gap-1.5 text-xs text-vin shrink-0"><span className="pastille" aria-hidden />{minuteDirect(m)}</span>}
    </div>
  );

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd([
        {
          "@context": "https://schema.org", "@type": "SportsEvent",
          name: `${m.home.name} – ${m.away.name}`, sport: "Rugby à XV", url: absolue(canonique),
          startDate: m.kickoff_at,
          eventStatus: m.status === "postponed" ? "https://schema.org/EventPostponed" : m.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          endDate: new Date(new Date(m.kickoff_at).getTime() + 2 * 3600e3).toISOString(),
          location: lieu,
          performer: [{ "@type": "SportsTeam", name: m.home.name }, { "@type": "SportsTeam", name: m.away.name }],
          homeTeam: { "@type": "SportsTeam", name: m.home.name, url: absolue(`/clubs/${m.home.slug}`) },
          awayTeam: { "@type": "SportsTeam", name: m.away.name, url: absolue(`/clubs/${m.away.slug}`) },
          competitor: [{ "@type": "SportsTeam", name: m.home.name }, { "@type": "SportsTeam", name: m.away.name }],
          organizer: ORGANISATION,
          image: absolue(`${canonique}/opengraph-image`),
          description: `${m.competition.name} : ${m.home.name} – ${m.away.name}${m.status === "finished" && m.home_score != null ? `, score final ${m.home_score}-${m.away_score}` : ""}.`,
        },
        filAriane([["Accueil", "/"], ["Matchs", "/matchs"], [m.competition.name, `/competitions/${m.competition.slug}`], [`${m.home.short_name ?? m.home.name} – ${m.away.short_name ?? m.away.name}`, canonique]]),
      ])} />
      <LiveRefresh matchId={m.id} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-sourdine">
          <Link href={`/competitions/${m.competition.slug}`} className="font-semibold text-vin underline underline-offset-4">{m.competition.name}</Link>
          {m.round && <span>, {libelleTour(m.round).replace(/^./, (c) => c.toLowerCase())}</span>}
        </p>
        <ActionsMatch titre={`${m.home.short_name ?? m.home.name} – ${m.away.short_name ?? m.away.name}`} coupEnvoi={m.kickoff_at} lieu={m.venue}
          aVenir={new Date(m.kickoff_at) > new Date()} competition={{ nom: m.competition.name, href: `/competitions/${m.competition.slug}` }} />
      </div>

      <section aria-label="Score" data-score-hero className="mt-4 bg-bordeaux text-white rounded-2xl px-4 pt-8 pb-5 sm:px-10 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8 entree-score">
          <div style={{ ["--i" as string]: 0 }}><TeamSide team={m.home} align="end" /></div>
          <div className="text-center" style={{ ["--i" as string]: 1 }}>
            {showScore ? (
              <ScoreAnime dom={m.home_score ?? 0} ext={m.away_score ?? 0} live={live} />
            ) : (
              <>
                <p className="text-sm text-white/70 first-letter:uppercase">{fmtDay(m.kickoff_at)}</p>
                <p className="titre font-extrabold text-5xl sm:text-6xl tnum mt-1">{fmtTime(m.kickoff_at)}</p>
              </>
            )}
            <p className="mt-3 text-sm font-semibold inline-flex items-center gap-2">
              {live && <span className="pastille" aria-hidden />}
              {live ? <>En direct, <ChronoLive kickoff={m.kickoff_at} clock={m.clock} updatedAt={(m as { clock_at?: string | null; updated_at?: string }).clock_at ?? (m as { updated_at?: string }).updated_at ?? null} status={m.status} periodes={m as Periodes} /></> : STATUS_LABEL[m.status]}
            </p>
            {showScore && (linescores?.[0] || m.home_tries != null) && (
              <p className="mt-1 text-xs text-white/60 tnum">
                {linescores?.[0] && <>Mi-temps {linescores[0].home}–{linescores[0].away}</>}
                {linescores?.[0] && m.home_tries != null && " · "}
                {m.home_tries != null && <>Essais {m.home_tries}–{m.away_tries ?? 0}</>}
              </p>
            )}
          </div>
          <div style={{ ["--i" as string]: 2 }}><TeamSide team={m.away} align="start" /></div>
        </div>
        {avant && avantProche && <div className="mt-6"><CompteARebours kickoff={m.kickoff_at} /></div>}
        {(m.venue || mx.arbitre || m.tv || !showScore) && <ul className="mt-6 pt-4 border-t border-white/10 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-white/80">
          {m.venue && <li><span aria-hidden>🏟️ </span>{m.venue}{mx.stade_ville ? `, ${mx.stade_ville}` : ""}</li>}
          {mx.arbitre && <li><span aria-hidden>🧑‍⚖️ </span>Arbitre : {mx.arbitre}</li>}
          {m.tv && <li><span aria-hidden>📺 </span>{m.tv}</li>}
          {!showScore && <li><span aria-hidden>🗓️ </span><span className="first-letter:uppercase inline-block">{fmtDay(m.kickoff_at)}</span>, {fmtTime(m.kickoff_at)}</li>}
        </ul>}
      </section>

      {/* ---------- 1. avant le match ---------- */}
      {avant && (
        <>
          <dl className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {infos.map(([ico, k, v]) => (
              <div key={k} className="bg-surface border border-trait rounded-2xl p-4">
                <dt className="text-sm text-sourdine"><span aria-hidden>{ico} </span>{k}</dt>
                <dd className="font-semibold mt-1">{v}</dd>
              </div>
            ))}
          </dl>
          {new Date(m.kickoff_at) > new Date() && m.status === "scheduled" && (
            <section aria-labelledby="h-prono" className="mt-6 bg-surface border border-trait rounded-2xl p-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex-1 min-w-[12rem]">
                <h2 id="h-prono" className="groovy text-2xl text-vin">Votre prono</h2>
                <p className="text-sm text-sourdine">{hn} – {an}, jusqu&apos;au coup d&apos;envoi. <Link href="/pronos" className="underline underline-offset-4 hover:text-vin">Tous les pronos</Link></p>
              </div>
              <Pronostic matchId={m.id} initial={monProno} ferme={false} connecte={!!viewer} />
            </section>
          )}
      {(prono || deltaOf(m.home_team_id) != null || forms.size > 0) && (
        <section aria-labelledby="h-algo" className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="bg-surface border border-trait rounded-2xl p-5 sm:p-6">
            <h2 id="h-algo" className="groovy text-2xl text-vin">L&apos;avis de l&apos;algorithme</h2>
            {prono && (
              <div className="mt-4">
                <Prono p={prono} home={hn} away={an} verrou={!full} />
              </div>
            )}
            {m.status === "finished" && deltaOf(m.home_team_id) != null && (
              <ul className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[m.home, m.away].map((t) => {
                  const d = deltaOf(t.id) ?? 0;
                  return (
                    <li key={t.id} className="rounded-xl bg-teinte p-3">
                      <span className="block text-sourdine">{t.short_name ?? t.name}</span>
                      <span className={`titre text-2xl font-extrabold tnum ${d >= 0 ? "text-ok" : "text-alerte"}`}>{d >= 0 ? "+" : "−"}{Math.abs(Math.round(d))}</span>
                      <span className="text-sourdine"> pts d&apos;Indice</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-4 text-xs text-sourdine">
              Indice Ambiance : {hn} {ratings.get(m.home_team_id) ? Math.round(ratings.get(m.home_team_id)!.rating) : "–"}, {an} {ratings.get(m.away_team_id) ? Math.round(ratings.get(m.away_team_id)!.rating) : "–"}.{" "}
              <Link href="/indice" className="underline underline-offset-2">Comment ça marche</Link>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[m.home, m.away].map((t) => {
              const f = forms.get(t.id);
              return (
                <div key={t.id} className="bg-surface border border-trait rounded-2xl p-4">
                  <p className="text-sm font-semibold mb-2 truncate">Forme {t.short_name ?? t.name}</p>
                  {f ? <Forme f={f} /> : <p className="text-sm text-sourdine">Pas encore de match.</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

          {m.status === "scheduled" && <AvantMatch match={m as never} home={m.home} away={m.away} full={full} />}
          <Confrontations matchId={m.id} home={m.home} away={m.away} />
        </>
      )}

      {/* ---------- 2. en direct ---------- */}
      {live && (
        <Onglets initial="direct" score={scoreCompact} onglets={[
          { id: "direct", label: "Direct", contenu: (
            <div className="grid gap-8">
              {events && events.length > 0
                ? <FilDuMatch events={filComplet as never} home={m.home} away={m.away} live={live} clock={m.clock} kickoff={m.kickoff_at} updatedAt={(m as { clock_at?: string | null; updated_at?: string }).clock_at ?? (m as { updated_at?: string }).updated_at ?? null} status={m.status} periodes={m as Periodes} />
                : <p className="text-sourdine">Le fil du match s&apos;affiche au premier fait de jeu.</p>}
              {events && events.length > 1 && <CourbeAscendant full={full} events={events as never} home={m.home} away={m.away} minuteActuelle={minute} />}
            </div>
          ) },
          { id: "stats", label: "Stats", contenu: joueurs.length ? <ChiffresEquipes lignes={chiffres} dom={hn} ext={an} couleurs={["var(--vin)", "var(--or)"]} /> : null },
          { id: "compos", label: "Compositions", contenu: <Compositions matchId={m.id} lnrUrl={(m as { lnr_url?: string | null }).lnr_url ?? null} lignes={notes as never} home={m.home} away={m.away} live={live} /> },
          { id: "joueurs", label: "Notes en direct", badge: joueurs.length || null, contenu: joueurs.length ? <StatsJoueurs joueurs={joueurs} dom={hn} ext={an} full={full} fini={false} matchId={m.id} /> : null },
          { id: "terrain", label: "Terrain", contenu: terrain ? <CarteTerrain actions={terrain} home={m.home} away={m.away} full={full} /> : null },
        ]} />
      )}

      {/* ---------- 3. match terminé ---------- */}
      {fini && (
        <>
          {hdm && <HommeDuMatch h={hdm} sup={supHdm} />}
          <Onglets initial="resume" score={scoreCompact} onglets={[
            { id: "resume", label: "Le match en chiffres", contenu: (
              <div className="grid gap-8">
                {joueurs.length > 0 && <ChiffresEquipes lignes={chiffres} dom={hn} ext={an} couleurs={["var(--vin)", "var(--or)"]} />}
                {events && events.length > 1 && <CourbeAscendant full={full} events={events as never} home={m.home} away={m.away} minuteActuelle={80} />}
                {terrain && <CarteTerrain actions={terrain} home={m.home} away={m.away} full={full} />}
      {(prono || deltaOf(m.home_team_id) != null || forms.size > 0) && (
        <section aria-labelledby="h-algo" className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="bg-surface border border-trait rounded-2xl p-5 sm:p-6">
            <h2 id="h-algo" className="groovy text-2xl text-vin">L&apos;avis de l&apos;algorithme</h2>
            {prono && (
              <div className="mt-4">
                <Prono p={prono} home={hn} away={an} verrou={!full} />
              </div>
            )}
            {m.status === "finished" && deltaOf(m.home_team_id) != null && (
              <ul className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[m.home, m.away].map((t) => {
                  const d = deltaOf(t.id) ?? 0;
                  return (
                    <li key={t.id} className="rounded-xl bg-teinte p-3">
                      <span className="block text-sourdine">{t.short_name ?? t.name}</span>
                      <span className={`titre text-2xl font-extrabold tnum ${d >= 0 ? "text-ok" : "text-alerte"}`}>{d >= 0 ? "+" : "−"}{Math.abs(Math.round(d))}</span>
                      <span className="text-sourdine"> pts d&apos;Indice</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-4 text-xs text-sourdine">
              Indice Ambiance : {hn} {ratings.get(m.home_team_id) ? Math.round(ratings.get(m.home_team_id)!.rating) : "–"}, {an} {ratings.get(m.away_team_id) ? Math.round(ratings.get(m.away_team_id)!.rating) : "–"}.{" "}
              <Link href="/indice" className="underline underline-offset-2">Comment ça marche</Link>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[m.home, m.away].map((t) => {
              const f = forms.get(t.id);
              return (
                <div key={t.id} className="bg-surface border border-trait rounded-2xl p-4">
                  <p className="text-sm font-semibold mb-2 truncate">Forme {t.short_name ?? t.name}</p>
                  {f ? <Forme f={f} /> : <p className="text-sm text-sourdine">Pas encore de match.</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

              </div>
            ) },
            { id: "joueurs", label: "Joueurs et notes", badge: joueurs.length || null, contenu: joueurs.length ? <StatsJoueurs joueurs={joueurs} dom={hn} ext={an} full={full} fini matchId={m.id} /> : null },
            { id: "fil", label: "Fil du match", badge: events?.filter((e) => ["try", "penalty_try"].includes(e.kind)).length || null, contenu: events && events.length > 0
              ? <FilDuMatch events={events as never} home={m.home} away={m.away} live={false} clock={m.clock} kickoff={m.kickoff_at} updatedAt={(m as { clock_at?: string | null; updated_at?: string }).clock_at ?? (m as { updated_at?: string }).updated_at ?? null} status={m.status} periodes={m as Periodes} /> : null },
            { id: "compos", label: "Compositions", contenu: <Compositions matchId={m.id} lnrUrl={(m as { lnr_url?: string | null }).lnr_url ?? null} lignes={notes as never} home={m.home} away={m.away} live={false} /> },
            { id: "infos", label: "Infos et historique", contenu: (
              <div className="grid gap-6">
                <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {infos.map(([ico, k, v]) => (
                    <div key={k} className="bg-surface border border-trait rounded-2xl p-4">
                      <dt className="text-sm text-sourdine"><span aria-hidden>{ico} </span>{k}</dt>
                      <dd className="font-semibold mt-1">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Confrontations matchId={m.id} home={m.home} away={m.away} />
              </div>
            ) },
          ]} />
        </>
      )}

      {live && <TribuneLive matchId={m.id} enDirect={live} home={m.home} away={m.away} totaux={totauxTribune} favori={viewer?.favorite_team_id} />}

      <Comments matchId={m.id} path={canonique} />
    </article>
  );
}

function TeamSide({ team, align }: { team: { slug: string; name: string; short_name: string | null; logo_url: string | null; color: string | null; abbreviation: string | null; id: string }; align: "start" | "end" }) {
  return (
    <Link href={`/clubs/${team.slug}`} className={`flex flex-col items-center sm:flex-row gap-2 sm:gap-4 hover:underline underline-offset-4 ${align === "end" ? "sm:justify-end sm:flex-row-reverse" : ""}`}>
      <TeamBadge team={team} size="lg" />
      <span className="titre font-bold text-base sm:text-2xl text-center sm:text-left leading-tight">{team.name}</span>
    </Link>
  );
}

/** Millisecondes écoulées depuis une date (négatif si elle est à venir). */
function depuis(iso: string) {
  return Date.now() - new Date(iso).getTime();
}

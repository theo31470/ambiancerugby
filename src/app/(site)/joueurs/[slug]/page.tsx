import { absolue, filAriane, jsonLd } from "@/lib/seo";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { urlMatch } from "@/lib/seo";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import FavoriteButton from "@/components/FavoriteButton";
import { Ballon } from "@/components/deco/Icones";
import { getPlayer, TEAM_LITE } from "@/lib/queries";
import { getViewer, publicClient } from "@/lib/supabase/server";
import { detailParSaison, clubsParSaison } from "@/lib/stats-detail";
import StatsCompletes from "@/components/joueur/StatsCompletes";
import { POSITIONS, age, fmtDate, fmtDay } from "@/lib/format";
import type { TeamLite } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/joueurs/[slug]">): Promise<Metadata> {
  const p = await getPlayer((await params).slug);
  if (!p) return {};
  const nom = `${p.first_name} ${p.last_name}`;
  const description = `${nom}${p.position ? `, ${p.position.toLowerCase()}` : ""} : stats saison par saison, essais, points, plaquages, notes sur 10 et derniers matchs.`;
  return { title: `${nom} : stats, notes et fiche joueur`, description, alternates: { canonical: `/joueurs/${p.slug}` }, openGraph: { type: "profile", title: nom, description, url: `/joueurs/${p.slug}`, images: p.photo_url ? [p.photo_url] : ["/og.jpg"] } };
}

type Totaux = { season: string; competition_id: string; games: number; starts: number; minutes: number; tries: number; conversions: number; penalty_goals: number; drop_goals: number; points: number; yellow: number; red: number; tackles: number; carries: number; metres: number; line_breaks: number; offloads: number; turnovers_won: number; motm: number; rating: number | null; games_saisis: number; competition?: { name: string; short_name: string | null; slug: string } };
const CLES = ["games", "starts", "minutes", "tries", "conversions", "penalty_goals", "drop_goals", "points", "yellow", "red", "tackles", "carries", "metres", "line_breaks", "offloads", "turnovers_won", "motm"] as const;
type Perf = { rating: number; minutes: number | null; starter: boolean | null; tries: number; points: number; tackles: number; line_breaks: number; turnovers_won: number; carries: number; metres: number; motm: boolean; match: { id: string; kickoff_at: string; home_score: number | null; away_score: number | null; home: TeamLite; away: TeamLite } };

export default async function JoueurPage({ params, searchParams }: PageProps<"/joueurs/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = await getPlayer(slug);
  if (!p) {
    // fiche fusionnée avec une autre : l'ancien lien redirige vers la bonne
    const { data: alias } = await publicClient().from("player_aliases").select("player:players(slug)").eq("slug", slug).maybeSingle();
    const cible = (alias as unknown as { player: { slug: string } | null } | null)?.player?.slug;
    if (cible) permanentRedirect(`/joueurs/${cible}`);
    notFound();
  }
  const a = age(p.birth_date);
  const db = publicClient();
  const [{ data: seasons }, { data: perfs }, viewer, { data: parcoursData }, details, clubs] = await Promise.all([
    db.from("player_season_totals").select("*").eq("player_id", p.id).order("season", { ascending: false }),
    db.from("player_match_stats")
      .select(`rating,minutes,starter,tries,points,tackles,line_breaks,turnovers_won,carries,metres,motm, match:matches!inner(id,kickoff_at,home_score,away_score, home:teams!matches_home_team_id_fkey(${TEAM_LITE}), away:teams!matches_away_team_id_fkey(${TEAM_LITE}))`)
      .eq("player_id", p.id)
      .order("match(kickoff_at)", { ascending: false })
      .limit(10),
    getViewer(),
    db.from("player_career").select("kind, ordre, equipe, periode, matchs, points").eq("player_id", p.id).order("kind").order("ordre"),
    detailParSaison(p.id),
    clubsParSaison(p.id),
  ]);
  const parcours = (parcoursData ?? []) as { kind: "club" | "selection"; ordre: number; equipe: string; periode: string | null; matchs: number | null; points: number | null }[];
  const { data: compsData } = await db.from("competitions").select("id,name,short_name,slug");
  const lignes = ((seasons ?? []) as Totaux[]).map((t) => ({ ...t, competition: (compsData ?? []).find((c) => c.id === t.competition_id) }));
  // saisons disponibles, de la plus récente à la plus ancienne, puis la carrière
  const saisons = [...new Set(lignes.map((t) => t.season))].sort((x, y) => y.localeCompare(x));
  const vue = typeof sp.stats === "string" && (sp.stats === "carriere" || saisons.includes(sp.stats)) ? sp.stats : (saisons[0] ?? "carriere");
  const parComp = vue === "carriere" ? lignes : lignes.filter((t) => t.season === vue);
  const cumul = (liste: Totaux[]) => {
    if (!liste.length) return undefined;
    const tot = Object.fromEntries(CLES.map((k) => [k, liste.reduce((s, t) => s + (Number(t[k]) || 0), 0)])) as Record<(typeof CLES)[number], number>;
    const notes = liste.filter((t) => t.rating != null && t.games_saisis > 0);
    const poids = notes.reduce((s, t) => s + t.games_saisis, 0);
    const rating = poids ? notes.reduce((s, t) => s + Number(t.rating) * t.games_saisis, 0) / poids : null;
    return { ...tot, rating };
  };
  const saison = cumul(parComp);
  const detail = details[vue];
  const noteSaison = saisons[0] ? cumul(lignes.filter((t) => t.season === saisons[0]))?.rating ?? null : null;
  const matchs = (perfs ?? []) as unknown as Perf[];
  const full = !!viewer?.supporter;

  const facts: [string, string | null][] = [
    ["Poste", p.position ? POSITIONS[p.position] : null],
    ["Nationalité", p.nationality],
    ["Naissance", p.birth_date ? `${fmtDate(p.birth_date)}${a != null ? ` (${a} ans)` : ""}` : null],
    ["Taille", p.height_cm ? `${(p.height_cm / 100).toFixed(2).replace(".", ",")} m` : null],
    ["Poids", p.weight_kg ? `${p.weight_kg} kg` : null],
    ["Sélections", p.caps != null ? String(p.caps) : null],
    ["Essais en carrière", p.career_tries != null ? String(p.career_tries) : null],
    ["Points en carrière", p.career_points != null ? String(p.career_points) : null],
  ];

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd([{ "@context": "https://schema.org", "@type": "Person", name: `${p.first_name} ${p.last_name}`, url: absolue(`/joueurs/${p.slug}`), ...(p.photo_url ? { image: p.photo_url } : {}), ...(p.position ? { jobTitle: `Joueur de rugby (${p.position})` } : { jobTitle: "Joueur de rugby" }), ...(p.nationality ? { nationality: p.nationality } : {}), ...(p.birth_date ? { birthDate: p.birth_date } : {}) }, filAriane([["Accueil", "/"], ["Joueurs", "/joueurs"], [`${p.first_name} ${p.last_name}`, `/joueurs/${p.slug}`]])])} />
      <div className="grid gap-10 md:grid-cols-[17rem_1fr] md:gap-14">
        <div className="relative w-full max-w-64">
          <div className="absolute inset-0 rounded-[1.5rem] bg-moutarde rotate-3" aria-hidden />
          {p.photo_url ? (
            <img src={p.photo_url} alt={`${p.first_name} ${p.last_name}`} className="relative w-full aspect-[4/5] object-cover object-bottom rounded-[1.5rem]" />
          ) : (
            <div className="relative w-full aspect-[4/5] rounded-[1.5rem] bg-vin grid place-items-center overflow-hidden" aria-hidden>
              <span className="groovy text-white text-8xl">{p.first_name.slice(0, 1)}{p.last_name.slice(0, 1)}</span>
              {p.number != null && <span className="absolute bottom-3 right-4 groovy text-5xl text-moutarde">{p.number}</span>}
            </div>
          )}
          {p.photo_url && p.photo_source && <p className="relative mt-2 text-[11px] text-sourdine">Photo : {p.photo_source}</p>}
          {noteSaison != null && (
            <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-bordeaux text-white grid place-items-center text-center shadow-[0_6px_0_-1px_rgba(0,0,0,.25)] rotate-[-6deg]">
              <span><span className="groovy text-3xl text-moutarde block leading-none">{Number(noteSaison).toFixed(1)}</span><span className="text-[10px] font-semibold">note Ambiance</span></span>
            </div>
          )}
        </div>
        <div>
          <p className="text-sourdine text-lg">{p.first_name}</p>
          <h1 className="groovy text-5xl sm:text-7xl text-vin leading-none">{p.last_name}</h1>
          {p.team && (
            <Link href={`/clubs/${p.team.slug}`} className="mt-4 inline-flex items-center gap-2 font-semibold hover:underline underline-offset-4">
              <TeamBadge team={p.team} size="sm" />
              {p.team.name}
              {p.number != null && <span className="text-sourdine font-normal">, n° {p.number}</span>}
            </Link>
          )}
          <div className="mt-4"><FavoriteButton kind="player" id={p.id} path={`/joueurs/${p.slug}`} /></div>

          <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 max-w-2xl">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="border-t-2 border-trait pt-2">
                <dt className="text-sm text-sourdine">{k}</dt>
                <dd className="titre font-bold text-lg tnum">{v}</dd>
              </div>
            ))}
          </dl>
          {p.bio && <p className="mt-8 max-w-prose text-lg whitespace-pre-line">{p.bio}</p>}
          {p.source === "wikipedia" && (
            <p className="mt-6 text-xs text-sourdine">Effectif : <a href="https://en.wikipedia.org" className="underline underline-offset-2">Wikipédia</a>, licence CC BY-SA. Une erreur ? Signalez-la en commentaire d&apos;un article.</p>
          )}
        </div>
      </div>

      <section aria-labelledby="h-saison" className="mt-14">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 mb-4">
          <h2 id="h-saison" className="groovy text-3xl text-vin">{vue === "carriere" ? "Carrière" : `Saison ${vue}`}</h2>
          <nav aria-label="Période" className="flex flex-wrap gap-1">
            {[...saisons.slice(0, 4), "carriere"].map((v) => (
              <Link key={v} href={`/joueurs/${p.slug}?stats=${encodeURIComponent(v)}#h-saison`} scroll={false} aria-current={v === vue ? "page" : undefined}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${v === vue ? "bg-vin text-white" : "bg-teinte hover:bg-trait"}`}>
                {v === "carriere" ? "Carrière" : v === saisons[0] ? `Cette saison (${v})` : v}
              </Link>
            ))}
          </nav>
        </div>
        {vue === "carriere" && <p className="-mt-2 mb-4 text-sm text-sourdine">Toutes les saisons suivies par Ambiance Rugby, puis son parcours complet.</p>}
        {saison ? (
          <>
            <dl className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {saison.rating != null && (
                <div className="bg-bordeaux text-white rounded-2xl p-4">
                  <dt className="text-xs text-white/70">Note moyenne</dt>
                  <dd className="groovy text-4xl text-moutarde tnum leading-tight">{Number(saison.rating).toFixed(1)}</dd>
                </div>
              )}
              {([
                ["Matchs", saison.games], ["Titulaire", saison.starts], ["Minutes", saison.minutes], ["Essais", saison.tries], ["Points", saison.points],
                ["Transformations", saison.conversions], ["Pénalités", saison.penalty_goals], ["Drops", saison.drop_goals],
                ["Plaquages", saison.tackles], ["Franchissements", saison.line_breaks], ["Passes après contact", saison.offloads], ["Ballons grattés", saison.turnovers_won],
                ["Mètres", saison.metres], ["Cartons jaunes", saison.yellow], ["Cartons rouges", saison.red], ["Homme du match", saison.motm],
              ] as [string, number][]).filter(([k, v]) => v || ["Matchs", "Essais", "Points"].includes(k)).map(([k, v]) => (
                <div key={k} className="carte-vie bg-surface border border-trait rounded-2xl p-4">
                  <dt className="text-xs text-sourdine">{k}</dt>
                  <dd className="titre text-3xl font-extrabold tnum">{v}</dd>
                </div>
              ))}
            </dl>
            {saison.minutes >= 80 && (
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="text-sourdine">Sur 80 minutes :</span>
                {([
                  ["plaquages", detail?.tackles ?? 0, detail?.minutes ?? 0], ["franchissements", detail?.line_breaks ?? 0, detail?.minutes ?? 0],
                  ["ballons grattés", detail?.turnovers_won ?? 0, detail?.minutes ?? 0], ["passes après contact", detail?.offloads ?? 0, detail?.minutes ?? 0],
                  ["points", saison.points, saison.minutes],
                ] as [string, number, number][]).filter(([, v, m]) => v > 0 && m >= 80).map(([k, v, m]) => (
                  <span key={k} className="rounded-full bg-teinte px-3 py-0.5 font-semibold tnum">{((v * 80) / m).toFixed(1).replace(".", ",")} {k}</span>
                ))}
                {detail && detail.matchs > 0 && detail.matchs < saison.games && (
                  <span className="text-xs text-sourdine self-center">(stats défensives sur {detail.matchs} match{detail.matchs > 1 ? "s" : ""} à feuille détaillée)</span>
                )}
              </div>
            )}
            {parComp.length > 1 && (
              <div className="mt-5 bg-surface border border-trait rounded-2xl overflow-x-auto">
                <table className="w-full text-sm tnum">
                  <caption className="sr-only">Détail par compétition</caption>
                  <thead><tr className="text-xs text-sourdine border-b border-trait">
                    <th scope="col" className="text-left font-semibold px-4 py-2">Compétition</th>
                    {vue === "carriere" && <th scope="col" className="font-semibold px-2">Saison</th>}
                    {[["MJ", "Matchs joués"], ["Min", "Minutes"], ["E", "Essais"], ["Pts", "Points"], ["Plaq.", "Plaquages"], ["Fr.", "Franchissements"], ["BG", "Ballons grattés"], ["CJ", "Cartons jaunes"], ["CR", "Cartons rouges"], ["Note", "Note moyenne"]].map(([h, t]) => <th key={h} scope="col" title={t} className="font-semibold px-2"><abbr title={t} className="no-underline">{h}</abbr></th>)}
                  </tr></thead>
                  <tbody>
                    {parComp.map((t) => (
                      <tr key={t.competition_id + t.season} className="border-b border-trait last:border-0">
                        <th scope="row" className="text-left font-semibold px-4 py-2">{t.competition ? <Link href={`/competitions/${t.competition.slug}`} className="hover:underline underline-offset-4">{t.competition.name}</Link> : "–"}</th>
                        {vue === "carriere" && <td className="text-center px-2 text-sourdine">{t.season}</td>}
                        {[t.games, t.minutes, t.tries, t.points, t.tackles || "–", t.line_breaks || "–", t.turnovers_won || "–", t.yellow, t.red].map((v, i) => <td key={i} className="text-center px-2">{v}</td>)}
                        <td className="text-center px-2 font-bold">{t.rating != null ? Number(t.rating).toFixed(1) : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {detail && <StatsCompletes d={detail} full={full} periode={vue === "carriere" ? "sur toute la période suivie" : `en ${vue}`} />}
          </>
        ) : (
          <div className="bg-surface border border-dashed border-trait rounded-2xl p-8 text-center">
            <Ballon className="w-14 mx-auto text-vin" />
            <p className="mt-3 text-sourdine">{vue === "carriere" ? "Pas encore de stats suivies par Ambiance Rugby." : "Pas encore de stats cette saison."} Elles arrivent automatiquement après chaque match.</p>
          </div>
        )}

        {vue === "carriere" && clubs.length > 0 && (
          <div className="mt-8">
            <h3 className="titre font-bold mb-3">Ses clubs, saison après saison</h3>
            <ol className="flex flex-wrap gap-2">
              {clubs.map((c) => (
                <li key={c.season + c.team.id}>
                  <Link href={`/clubs/${c.team.slug}`} className="flex items-center gap-2 rounded-full bg-surface border border-trait pl-1.5 pr-3 py-1 text-sm hover:border-vin">
                    {c.team.logo_url
                      ? <img src={c.team.logo_url} alt="" className="w-6 h-6 object-contain" />
                      : <span className="w-6 h-6 rounded-full bg-teinte" />}
                    <span className="text-sourdine tnum">{c.season}</span>
                    <b>{c.team.short_name ?? c.team.name}</b>
                    <span className="text-xs text-sourdine tnum">{c.matchs} m.</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}

        {vue === "carriere" && parcours.length > 0 && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {(["club", "selection"] as const).map((k) => {
              const liste = parcours.filter((x) => x.kind === k);
              if (!liste.length) return null;
              return (
                <div key={k} className="bg-surface border border-trait rounded-2xl overflow-x-auto">
                  <table className="w-full text-sm tnum">
                    <caption className="text-left titre font-bold px-4 pt-4 pb-2">{k === "club" ? "Parcours en club" : "En sélection"}</caption>
                    <thead><tr className="text-xs text-sourdine border-b border-trait">
                      <th scope="col" className="text-left font-semibold px-4 py-2">Période</th>
                      <th scope="col" className="text-left font-semibold px-2">Équipe</th>
                      <th scope="col" className="font-semibold px-2">Matchs</th>
                      <th scope="col" className="font-semibold px-4">Points</th>
                    </tr></thead>
                    <tbody>
                      {liste.map((x) => (
                        <tr key={x.ordre + x.equipe} className="border-b border-trait last:border-0">
                          <td className="px-4 py-2 text-sourdine whitespace-nowrap">{x.periode ?? "–"}</td>
                          <th scope="row" className="text-left font-semibold px-2">{x.equipe}</th>
                          <td className="text-center px-2">{x.matchs ?? "–"}</td>
                          <td className="text-center px-4">{x.points ?? "–"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
            <p className="text-xs text-sourdine lg:col-span-2">Parcours : Wikipédia (licence CC BY-SA), matchs et points en championnat.</p>
          </div>
        )}
      </section>

      {matchs.length > 0 && (
        <section aria-labelledby="h-perfs" className="mt-12">
          <h2 id="h-perfs" className="groovy text-3xl text-vin mb-4">Ses derniers matchs</h2>
          <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait overflow-hidden">
            {(full ? matchs : matchs.slice(0, 3)).map((x) => (
              <li key={x.match.id}>
                <Link href={urlMatch(x.match)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-teinte">
                  <span className="text-sm text-sourdine w-24">{fmtDay(x.match.kickoff_at, { day: "numeric", month: "short", year: "2-digit" })}</span>
                  <span className="flex-1 min-w-48 font-semibold">{x.match.home.short_name ?? x.match.home.name} {x.match.home_score}–{x.match.away_score} {x.match.away.short_name ?? x.match.away.name}</span>
                  {full && <span className="text-sm text-sourdine tnum">{[x.minutes ? `${x.minutes} min${x.starter === false ? " (remplaçant)" : ""}` : null, x.tries ? `${x.tries} essai${x.tries > 1 ? "s" : ""}` : null, x.points ? `${x.points} pts` : null, x.tackles ? `${x.tackles} plaquages` : null, x.line_breaks ? `${x.line_breaks} franchissement${x.line_breaks > 1 ? "s" : ""}` : null, x.turnovers_won ? `${x.turnovers_won} ballon${x.turnovers_won > 1 ? "s" : ""} gratté${x.turnovers_won > 1 ? "s" : ""}` : null].filter(Boolean).join(", ")}</span>}
                  {x.motm && <span className="text-[10px] font-bold rounded-full bg-moutarde text-bordeaux px-1.5 py-0.5">Homme du match</span>}
                  <span className={`min-w-12 text-center rounded-full px-2 py-0.5 titre font-extrabold ${x.rating >= 8 ? "bg-moutarde text-bordeaux" : x.rating >= 6.5 ? "bg-teinte" : "bg-alerte/10 text-alerte"}`}>{Number(x.rating).toFixed(1)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {!full && matchs.length > 3 && (
            <p className="mt-3 text-sm">Tout l&apos;historique et le détail des stats sont réservés aux Supporters. <Link href="/abonnement" className="text-vin font-semibold underline underline-offset-4">Devenir Supporter</Link></p>
          )}
        </section>
      )}
    </div>
  );
}

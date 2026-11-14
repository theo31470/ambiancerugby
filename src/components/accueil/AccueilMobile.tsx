/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ReactNode } from "react";
import TeamBadge from "@/components/TeamBadge";
import { ArticleHero } from "@/components/ArticleCard";
import { Ballon, Coupe, Echarpe, Podium, Trompette } from "@/components/deco/Icones";
import { CATEGORIES, fmtDay, fmtRelative, fmtTime, isLive } from "@/lib/format";
import { urlMatch } from "@/lib/seo";
import type { Article, MatchFull, StandingRow, TeamLite } from "@/lib/types";

/**
 * Accueil des téléphones, façon app : l'essentiel d'abord, en cartes qu'on fait défiler au pouce.
 * 1. le direct / les prochains matchs   2. mon club   3. à la une   4. derniers résultats   5. classement Top 14
 */
export type MonClub = { team: TeamLite; prochain: MatchFull | null; dernier: MatchFull | null; actus: Article[] };

export default function AccueilMobile(props: {
  prenom: string | null;
  connecte: boolean;
  supporter: boolean;
  jour: string | null;
  aujourdhui: boolean;
  matchs: MatchFull[];
  resultats: MatchFull[];
  articles: Article[];
  classement: StandingRow[];
  club: MonClub | null;
}) {
  const { prenom, connecte, supporter, jour, aujourdhui, matchs, resultats, articles, classement, club } = props;
  const direct = matchs.filter((m) => isLive(m.status));
  // le direct en tête, puis l'ordre du jour
  const fil = [...direct, ...matchs.filter((m) => !isLive(m.status))];
  const [une, ...autres] = articles;
  const heure = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hour12: false });
  const salut = Number(heure) >= 18 || Number(heure) < 5 ? "Bonsoir" : "Salut";

  return (
    <div className="lg:hidden">
      {/* bonjour + raccourcis */}
      <section className="pleine-largeur -mt-6 bg-bordeaux text-white pt-5 pb-5 relative overflow-hidden">
        <img src="/logo-blanc.png" alt="" aria-hidden className="absolute -right-10 -top-6 w-44 opacity-[0.07] rotate-12" />
        <div className="px-4 relative">
          <p className="text-sm text-white/60 first-letter:uppercase">{fmtDay(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p>
          <p className="groovy text-[2rem] leading-tight mt-0.5">
            {prenom ? <>{salut} {prenom} !</> : <>Le rugby, côté <span className="text-moutarde">tribune.</span></>}
          </p>
        </div>
        <nav aria-label="Raccourcis" className="mt-4 defile-scroll overflow-x-auto">
          <ul className="flex gap-2 px-4 w-max">
            <Puce href="/competitions/top-14" icone={<Coupe className="h-5 w-auto" />}>Classement Top 14</Puce>
            <Puce href="/competitions/pro-d2" icone={<Coupe className="h-5 w-auto" />}>Pro D2</Puce>
            <Puce href="/indice" icone={<Podium className="h-5 w-auto" />}>Indice Ambiance</Puce>
            <Puce href="/pronos/xv" icone={<Ballon className="h-4 w-auto" />}>XV de la semaine</Puce>
            <Puce href="/actus" icone={<Trompette className="h-5 w-auto" />}>Actus</Puce>
          </ul>
        </nav>
      </section>

      <div className="grid gap-9 mt-6">
        {/* 1. le direct / les prochains matchs */}
        <Bloc titre={direct.length ? "En direct" : jour ? (aujourdhui ? "Matchs du jour" : "Prochains matchs") : "Matchs"} pastille={direct.length > 0}
          sousTitre={!direct.length && jour && !aujourdhui ? fmtDay(`${jour}T12:00:00Z`) : undefined} lien="/matchs">
          {fil.length ? (
            <Carrousel>
              {fil.map((m) => <CarteMatch key={m.id} m={m} />)}
            </Carrousel>
          ) : (
            <p className="mx-4 rounded-2xl border border-dashed border-trait p-5 text-sm text-sourdine text-center">La banda accorde ses instruments : aucun match programmé pour l&apos;instant.</p>
          )}
        </Bloc>

        {/* 2. mon club */}
        {club ? (
          <section className="px-4">
            <div className="rounded-3xl overflow-hidden text-white" style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${club.team.color ?? "var(--vin)"} 72%, #12060a) 0%, color-mix(in oklab, ${club.team.color ?? "var(--vin)"} 42%, #12060a) 100%)` }}>
              <Link href={`/clubs/${club.team.slug}`} className="flex items-center gap-3 p-4 pb-3">
                <span className="w-11 h-11 rounded-xl bg-white grid place-items-center shrink-0"><TeamBadge team={club.team} size="sm" /></span>
                <span className="flex-1 min-w-0">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-white/70 block">Mon club</span>
                  <span className="titre font-bold text-lg block truncate">{club.team.name}</span>
                </span>
                <Fleche />
              </Link>
              <div className="grid grid-cols-2 gap-px bg-white/15">
                <MiniMatch titre="Prochain match" m={club.prochain} clubId={club.team.id} />
                <MiniMatch titre="Dernier résultat" m={club.dernier} clubId={club.team.id} />
              </div>
              {club.actus.length > 0 && (
                <ul className="bg-black/15 divide-y divide-white/10">
                  {club.actus.map((a) => (
                    <li key={a.id}>
                      <Link href={`/actus/${a.slug}`} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                        <span className="flex-1 font-semibold line-clamp-1">{a.title}</span>
                        <Fleche petit />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : (
          <section className="px-4">
            <Link href={connecte ? "/compte/profil" : "/inscription"} className="flex items-center gap-4 rounded-3xl p-4 bg-teinte">
              <Echarpe className="h-10 w-auto text-vin shrink-0" />
              <span className="flex-1">
                <span className="font-semibold block">{connecte ? "Choisis ton club de cœur" : "Suis ton club"}</span>
                <span className="text-sm text-sourdine">Ses matchs, ses résultats et ses actus, ici, en premier.</span>
              </span>
              <Fleche className="text-sourdine" />
            </Link>
          </section>
        )}

        {/* 3. à la une */}
        {une && (
          <Bloc titre="À la une" lien="/actus">
            <div className="px-4"><ArticleHero a={une} /></div>
            {autres.length > 0 && (
              <Carrousel>
                {autres.slice(0, 5).map((a) => (
                  <Link key={a.id} href={`/actus/${a.slug}`} className="block w-60 shrink-0 snap-start">
                    {a.cover_url ? (
                      <img src={a.cover_url} alt="" loading="lazy" className="w-full aspect-[16/10] object-cover rounded-xl" />
                    ) : (
                      <span className="w-full aspect-[16/10] rounded-xl bg-vin grid place-items-center"><img src="/logo-blanc.png" alt="" className="w-1/3 opacity-25" /></span>
                    )}
                    <span className="block mt-2 text-xs text-sourdine">
                      <span className="text-vin font-semibold">{CATEGORIES[a.category] ?? a.category}</span>
                      {a.published_at && <>, {fmtRelative(a.published_at)}</>}
                    </span>
                    <span className="block font-bold leading-snug line-clamp-2">{a.title}</span>
                  </Link>
                ))}
              </Carrousel>
            )}
          </Bloc>
        )}

        {/* 4. derniers résultats */}
        {resultats.length > 0 && (
          <Bloc titre="Derniers résultats" lien="/matchs">
            <Carrousel>
              {resultats.map((m) => <CarteMatch key={m.id} m={m} />)}
            </Carrousel>
          </Bloc>
        )}

        {/* 5. Top 14 : le haut du tableau */}
        {classement.length > 0 && (
          <Bloc titre="Top 14" lien="/competitions/top-14" lienTexte="Classement complet">
            <ol className="mx-4 rounded-2xl bg-surface border border-trait divide-y divide-trait overflow-hidden">
              {classement.slice(0, 6).map((r) => (
                <li key={r.team.id}>
                  <Link href={`/clubs/${r.team.slug}`} className="flex items-center gap-3 px-4 py-2.5 active:bg-teinte">
                    <span className={`w-1 self-stretch rounded-full ${r.rank <= 2 ? "bg-vin" : "bg-moutarde"}`} aria-hidden />
                    <span className="titre font-bold w-5 tnum text-sourdine">{r.rank}</span>
                    <TeamBadge team={r.team} size="sm" />
                    <span className="font-semibold flex-1 truncate">{r.team.short_name ?? r.team.name}</span>
                    <span className="text-xs text-sourdine tnum">{r.played} j.</span>
                    <span className="titre font-extrabold tnum w-8 text-right">{r.points}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </Bloc>
        )}

        {/* Supporter, en une ligne */}
        {!supporter && (
          <section className="px-4">
            <Link href="/abonnement" className="flex items-center gap-3 rounded-2xl bg-moutarde text-bordeaux p-4 shadow-[0_4px_0_0_var(--or)] active:translate-y-0.5 active:shadow-none transition-all">
              <Ballon className="w-10 shrink-0 text-bordeaux [--deco-trait:var(--moutarde)]" />
              <span className="flex-1 text-sm"><span className="groovy text-lg block leading-tight">Deviens Supporter</span>Stats complètes et alertes de tes matchs · 5,99 €/mois</span>
              <Fleche />
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

/* ---------- morceaux ---------- */

function Bloc({ titre, sousTitre, lien, lienTexte = "Tout voir", pastille, children }: { titre: string; sousTitre?: string; lien?: string; lienTexte?: string; pastille?: boolean; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between gap-3 px-4 mb-3">
        <div className="min-w-0">
          <h2 className="titre text-xl font-extrabold flex items-center gap-2">
            {pastille && <span className="w-2.5 h-2.5 rounded-full bg-alerte animate-pulse" aria-hidden />}
            {titre}
          </h2>
          {sousTitre && <p className="text-sm text-sourdine first-letter:uppercase">{sousTitre}</p>}
        </div>
        {lien && <Link href={lien} className="text-sm font-semibold text-vin shrink-0 py-1">{lienTexte}</Link>}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

/** Rangée qu'on fait défiler au pouce, cartes aimantées. */
function Carrousel({ children }: { children: ReactNode }) {
  return (
    <div className="defile-scroll overflow-x-auto snap-x snap-mandatory scroll-px-4 overscroll-x-contain">
      <div className="flex gap-3 px-4 w-max">{children}</div>
    </div>
  );
}

function CarteMatch({ m }: { m: MatchFull }) {
  const live = isLive(m.status);
  const fini = m.status === "finished";
  const score = live || fini;
  const gagne = (cote: "home" | "away") => fini && m.home_score != null && m.away_score != null &&
    (cote === "home" ? m.home_score > m.away_score : m.away_score > m.home_score);
  return (
    <Link href={urlMatch(m)} className={`block w-[15.5rem] shrink-0 snap-start rounded-2xl p-3.5 border ${live ? "bg-bordeaux text-white border-bordeaux" : "bg-surface border-trait"}`}>
      <p className={`flex items-center justify-between text-[11px] font-semibold ${live ? "text-white/70" : "text-sourdine"}`}>
        <span className="truncate">{m.competition.short_name ?? m.competition.name}</span>
        {live ? (
          <span className="flex items-center gap-1 text-moutarde"><span className="w-1.5 h-1.5 rounded-full bg-moutarde animate-pulse" />{m.status === "halftime" ? "Mi-temps" : "Direct"}</span>
        ) : fini ? (
          <span>{fmtDay(m.kickoff_at, { day: "numeric", month: "short" })}</span>
        ) : (
          <span className="first-letter:uppercase">{fmtDay(m.kickoff_at, { weekday: "short", day: "numeric" })}</span>
        )}
      </p>
      <div className="mt-2.5 grid gap-2">
        {(["home", "away"] as const).map((c) => {
          const t = m[c];
          const s = c === "home" ? m.home_score : m.away_score;
          return (
            <div key={c} className="flex items-center gap-2.5">
              <TeamBadge team={t} size="sm" />
              <span className={`flex-1 truncate ${gagne(c) ? "font-bold" : "font-semibold"} ${fini && !gagne(c) ? "opacity-70" : ""}`}>{t.short_name ?? t.name}</span>
              {score ? (
                <span className={`titre text-lg font-extrabold tnum ${live ? "text-moutarde" : ""}`}>{s ?? 0}</span>
              ) : c === "home" ? (
                <span className="titre font-bold tnum text-vin">{fmtTime(m.kickoff_at)}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </Link>
  );
}

function MiniMatch({ titre, m, clubId }: { titre: string; m: MatchFull | null; clubId: string }) {
  if (!m) return <div className="bg-black/10 p-3.5 text-sm"><p className="text-[11px] uppercase tracking-wider font-bold text-white/60">{titre}</p><p className="mt-1 text-white/70">À venir</p></div>;
  const dom = m.home_team_id === clubId;
  const adv = dom ? m.away : m.home;
  const fini = m.status === "finished";
  const nous = dom ? m.home_score : m.away_score;
  const eux = dom ? m.away_score : m.home_score;
  const issue = fini && nous != null && eux != null ? (nous > eux ? "V" : nous < eux ? "D" : "N") : null;
  return (
    <Link href={urlMatch(m)} className="bg-black/10 p-3.5 block active:bg-black/20">
      <p className="text-[11px] uppercase tracking-wider font-bold text-white/60">{titre}</p>
      <p className="mt-1.5 flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-white grid place-items-center shrink-0"><TeamBadge team={adv} size="xs" /></span>
        <span className="font-semibold truncate text-sm">{dom ? "vs" : "à"} {adv.short_name ?? adv.name}</span>
      </p>
      <p className="mt-1.5 text-sm">
        {fini ? (
          <span className="flex items-center gap-2">
            {issue && <span className={`w-5 h-5 rounded grid place-items-center text-[11px] font-bold ${issue === "V" ? "bg-moutarde text-bordeaux" : "bg-white/20"}`}>{issue}</span>}
            <span className="titre font-extrabold tnum">{nous}–{eux}</span>
          </span>
        ) : isLive(m.status) ? (
          <span className="titre font-extrabold tnum text-moutarde">{nous ?? 0}–{eux ?? 0} · direct</span>
        ) : (
          <span className="text-white/85 first-letter:uppercase">{fmtDay(m.kickoff_at, { weekday: "short", day: "numeric", month: "short" })} · {fmtTime(m.kickoff_at)}</span>
        )}
      </p>
    </Link>
  );
}

function Puce({ href, icone, children }: { href: string; icone: ReactNode; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-2 rounded-full bg-white/10 active:bg-white/20 pl-2.5 pr-3.5 py-2 text-sm font-semibold whitespace-nowrap text-white [--deco-trait:var(--bordeaux)]">
        <span className="text-moutarde">{icone}</span>{children}
      </Link>
    </li>
  );
}

const Fleche = ({ className = "", petit = false }: { className?: string; petit?: boolean }) => (
  <svg viewBox="0 0 20 20" className={`${petit ? "w-3.5 h-3.5" : "w-4 h-4"} shrink-0 opacity-70 ${className}`} aria-hidden><path d="m7.5 4.5 5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

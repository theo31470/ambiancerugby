/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ReactNode } from "react";
import TeamBadge from "@/components/TeamBadge";
import { urlMatch } from "@/lib/seo";
import type { LigneJoueur, LigneMatch, LigneSaison, Records as R, Serie } from "@/lib/records";

const jour = (iso: string, annee = true) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", ...(annee ? { year: "numeric" } : {}) });
const nom = (t: { short_name: string | null; name: string }) => t.short_name ?? t.name;

function Carte({ titre, unite, vide, children }: { titre: string; unite?: string; vide?: boolean; children: ReactNode }) {
  return (
    <section className="bg-surface border border-trait rounded-2xl p-4 sm:p-5">
      <h3 className="titre font-extrabold text-lg flex items-baseline justify-between gap-2">{titre}{unite && <span className="text-xs font-semibold text-sourdine">{unite}</span>}</h3>
      {vide ? <p className="mt-3 text-sm text-sourdine">Pas encore assez de données : elles arrivent avec l&apos;import des anciennes feuilles de match.</p> : <ol className="mt-3 grid gap-1">{children}</ol>}
    </section>
  );
}

function Rang({ i, valeur, children, href }: { i: number; valeur: ReactNode; children: ReactNode; href?: string }) {
  const corps = (
    <>
      <span className={`w-7 h-7 shrink-0 grid place-items-center rounded-full text-xs font-bold tnum ${i === 0 ? "bg-moutarde text-bordeaux" : "bg-teinte text-sourdine"}`}>{i + 1}</span>
      <span className="min-w-0 flex-1 overflow-hidden text-sm">{children}</span>
      <b className={`tnum shrink-0 ${i === 0 ? "groovy text-2xl text-vin font-normal" : "text-lg"}`}>{valeur}</b>
    </>
  );
  return <li>{href ? <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-teinte/60">{corps}</Link> : <div className="flex items-center gap-3 px-2 py-1.5 -mx-2">{corps}</div>}</li>;
}

function Match({ m }: { m: LigneMatch }) {
  return (
    <span className="flex items-center gap-2 min-w-0">
      <TeamBadge team={m.home} />
      <span className="min-w-0">
        <span className="block truncate">{nom(m.home)} <b className="tnum">{m.home_score}-{m.away_score}</b> {nom(m.away)}</span>
        <span className="block text-xs text-sourdine">{jour(m.kickoff_at)}</span>
      </span>
    </span>
  );
}

function Joueur({ l, detail }: { l: LigneJoueur; detail?: string }) {
  return (
    <span className="flex items-center gap-2 min-w-0">
      {l.joueur.photo_url ? <img src={l.joueur.photo_url} alt="" loading="lazy" className="w-7 h-7 rounded-full object-cover object-top bg-teinte shrink-0" /> : <span className="w-7 h-7 rounded-full bg-teinte shrink-0" />}
      <span className="min-w-0"><span className="block truncate font-semibold">{l.joueur.first_name} {l.joueur.last_name}</span>{detail && <span className="block truncate text-xs text-sourdine">{detail}</span>}</span>
    </span>
  );
}

const serieTexte = (s: Serie) => `du ${jour(s.debut)} au ${jour(s.fin)}${s.enCours ? ", toujours en cours" : ""}`;

export default function Records({ r }: { r: R }) {
  const lienJ = (l: LigneJoueur) => `/joueurs/${l.joueur.slug}`;
  const matchJ = (l: LigneJoueur) => l.match ? `${l.team ? `${nom(l.team)} · ` : ""}${nom(l.match.home)} ${l.match.home_score}-${l.match.away_score} ${nom(l.match.away)}, ${jour(l.match.kickoff_at)}` : "";
  const saisonLigne = (s: LigneSaison) => (
    <span className="flex items-center gap-2 min-w-0"><TeamBadge team={s.team} /><span className="truncate"><b>{nom(s.team)}</b> <span className="text-sourdine">{s.season}</span></span></span>
  );
  return (
    <div className="grid gap-8">
      <p className="text-sm text-sourdine max-w-prose">
        Sur {r.matchs.toLocaleString("fr-FR")} matchs suivis par Ambiance Rugby{r.saisons.length ? `, de ${r.saisons.at(-1)} à ${r.saisons[0]}` : ""}. Les records de joueurs s&apos;étoffent à mesure que les feuilles de match des anciennes saisons sont importées.
      </p>

      <div>
        <h2 className="groovy text-3xl text-vin mb-4">Les équipes</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Carte titre="Plus larges victoires" unite="écart">
            {r.plusLarges.map((m, i) => <Rang key={m.id} i={i} valeur={`+${m.valeur}`} href={urlMatch(m)}><Match m={m} /></Rang>)}
          </Carte>
          <Carte titre="Matchs les plus prolifiques" unite="points">
            {r.plusProlifiques.map((m, i) => <Rang key={m.id} i={i} valeur={m.valeur} href={urlMatch(m)}><Match m={m} /></Rang>)}
          </Carte>
          <Carte titre="Plus gros totaux d'une équipe" unite="points">
            {r.plusGrosScores.map((m, i) => (
              <Rang key={m.id + m.cote} i={i} valeur={m.valeur} href={urlMatch(m)}>
                <span className="flex items-center gap-2 min-w-0"><TeamBadge team={m[m.cote]} /><span className="min-w-0"><span className="block truncate"><b>{nom(m[m.cote])}</b> contre {nom(m[m.cote === "home" ? "away" : "home"])}</span><span className="block text-xs text-sourdine">{jour(m.kickoff_at)}</span></span></span>
              </Rang>
            ))}
          </Carte>
          <Carte titre="Plus longues séries de victoires" unite="victoires">
            {r.seriesVictoires.map((s, i) => (
              <Rang key={s.team.id} i={i} valeur={s.n} href={`/clubs/${s.team.slug}`}>
                <span className="flex items-center gap-2 min-w-0"><TeamBadge team={s.team} /><span className="min-w-0"><b className="block truncate">{nom(s.team)}</b><span className="block text-xs text-sourdine truncate">{serieTexte(s)}</span></span></span>
              </Rang>
            ))}
          </Carte>
          <Carte titre="Invincibles à domicile" unite="matchs sans défaite">
            {r.invincibiliteDomicile.map((s, i) => (
              <Rang key={s.team.id} i={i} valeur={s.n} href={`/clubs/${s.team.slug}`}>
                <span className="flex items-center gap-2 min-w-0"><TeamBadge team={s.team} /><span className="min-w-0"><b className="block truncate">{nom(s.team)}</b><span className="block text-xs text-sourdine truncate">{serieTexte(s)}</span></span></span>
              </Rang>
            ))}
          </Carte>
          <Carte titre="Meilleures attaques sur une saison" unite="points par match" vide={!r.attaques.length}>
            {r.attaques.map((s, i) => <Rang key={s.team.id + s.season} i={i} valeur={(s.valeur / s.joues).toFixed(1).replace(".", ",")}>{saisonLigne(s)}</Rang>)}
          </Carte>
          <Carte titre="Meilleures défenses sur une saison" unite="points encaissés par match" vide={!r.defenses.length}>
            {r.defenses.map((s, i) => <Rang key={s.team.id + s.season} i={i} valeur={(s.valeur / s.joues).toFixed(1).replace(".", ",")}>{saisonLigne(s)}</Rang>)}
          </Carte>
        </div>
      </div>

      <div>
        <h2 className="groovy text-3xl text-vin mb-4">Les joueurs</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Carte titre="Essais sur une saison" unite="essais" vide={!r.essaisSaison.length}>
            {r.essaisSaison.map((l, i) => <Rang key={l.joueur.id + l.season} i={i} valeur={l.valeur} href={lienJ(l)}><Joueur l={l} detail={l.season} /></Rang>)}
          </Carte>
          <Carte titre="Points sur une saison" unite="points" vide={!r.pointsSaison.length}>
            {r.pointsSaison.map((l, i) => <Rang key={l.joueur.id + l.season} i={i} valeur={l.valeur} href={lienJ(l)}><Joueur l={l} detail={l.season} /></Rang>)}
          </Carte>
          <Carte titre="Essais, toutes saisons" unite="essais" vide={!r.essaisTotal.length}>
            {r.essaisTotal.map((l, i) => <Rang key={l.joueur.id} i={i} valeur={l.valeur} href={lienJ(l)}><Joueur l={l} /></Rang>)}
          </Carte>
          <Carte titre="Essais dans un match" unite="essais" vide={!r.essaisMatch.length}>
            {r.essaisMatch.map((l, i) => <Rang key={l.joueur.id + l.match?.id} i={i} valeur={l.valeur} href={lienJ(l)}><Joueur l={l} detail={matchJ(l)} /></Rang>)}
          </Carte>
          <Carte titre="Points dans un match" unite="points" vide={!r.pointsMatch.length}>
            {r.pointsMatch.map((l, i) => <Rang key={l.joueur.id + l.match?.id} i={i} valeur={l.valeur} href={lienJ(l)}><Joueur l={l} detail={matchJ(l)} /></Rang>)}
          </Carte>
          <Carte titre="Plaquages dans un match" unite="plaquages" vide={!r.plaquagesMatch.length}>
            {r.plaquagesMatch.map((l, i) => <Rang key={l.joueur.id + l.match?.id} i={i} valeur={l.valeur} href={lienJ(l)}><Joueur l={l} detail={matchJ(l)} /></Rang>)}
          </Carte>
        </div>
      </div>
    </div>
  );
}

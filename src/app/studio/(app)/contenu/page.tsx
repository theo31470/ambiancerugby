import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MATCH_SELECT } from "@/lib/queries";
import { isoFromNow } from "@/lib/format";
import PageHeader from "@/components/admin/PageHeader";
import { changerStatut } from "./actions";
import type { MatchFull } from "@/lib/types";

export const metadata = { title: "Contenu" };

/** Compétitions qui méritent un post le lendemain, dans l'ordre d'intérêt pour l'audience. */
const PRIORITE = ["six-nations", "nations-championship", "tests-internationaux", "coupe-du-monde", "top-14", "champions-cup", "pro-d2", "challenge-cup"];
const LIBELLE: Record<string, string> = { idee: "Idée", brouillon: "Brouillon", pret: "Prêt", publie: "Publié" };
const RESEAU: Record<string, string> = { instagram: "Insta", facebook: "FB", x: "X", tiktok: "TikTok", linkedin: "LinkedIn" };

type Contenu = { id: string; modele: string; titre: string; statut: string; prevu_le: string | null; publie_le: string | null; reseaux: string[]; match_id: string | null; updated_at: string };

export default async function Contenu() {
  const db = await createClient();
  const [{ data: recents }, { data: aVenir }, { data: posts }, { count: brouillons }] = await Promise.all([
    db.from("matches").select(MATCH_SELECT).eq("status", "finished").gte("kickoff_at", isoFromNow(-4 * 86400e3)).order("kickoff_at", { ascending: false }).limit(200),
    db.from("matches").select(MATCH_SELECT).eq("status", "scheduled").gte("kickoff_at", new Date().toISOString()).lte("kickoff_at", isoFromNow(8 * 86400e3)).order("kickoff_at").limit(200),
    db.from("contenus").select("id,modele,titre,statut,prevu_le,publie_le,reseaux,match_id,updated_at").order("updated_at", { ascending: false }).limit(60),
    db.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
  ]);
  const rang = (m: MatchFull) => { const i = PRIORITE.indexOf(m.competition.slug); const bleus = [m.home.name, m.away.name].includes("France") ? -10 : 0; return (i < 0 ? 99 : i) + bleus; };
  const suivis = (l: MatchFull[] | null) => ((l ?? []) as MatchFull[]).filter((m) => PRIORITE.includes(m.competition.slug)).sort((a, b) => rang(a) - rang(b));
  const aRaconter = suivis(recents as MatchFull[] | null).slice(0, 12);
  const prochains = suivis(aVenir as MatchFull[] | null).slice(0, 6);
  const liste = (posts ?? []) as Contenu[];
  const parMatch = new Map(liste.filter((p) => p.match_id).map((p) => [p.match_id!, p]));
  const nom = (t: { short_name: string | null; name: string }) => t.short_name ?? t.name;
  const quand = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const colonnes: { id: string; titre: string; vide: string }[] = [
    { id: "pret", titre: "Prêts à publier", vide: "Rien en attente." },
    { id: "brouillon", titre: "Brouillons", vide: "Aucun brouillon." },
    { id: "publie", titre: "Publiés récemment", vide: "Rien de publié pour l'instant." },
  ];

  return (
    <div>
      <PageHeader titre="Contenu"
        description="Tout ce que la rédaction publie : posts pour les réseaux générés avec les données du site, et articles."
        actions={<><Link href="/studio/articles/nouveau" className="bouton text-sm">Nouvel article</Link><Link href="/studio/articles" className="bouton-discret text-sm">Articles{brouillons ? ` (${brouillons} brouillon${brouillons > 1 ? "s" : ""})` : ""}</Link></>}
        aide={<>
          <p>Chaque match terminé d&apos;une compétition suivie peut devenir un carrousel de 5 images : score, notes, chiffres, courbe d&apos;ascendant et histoire de la confrontation.</p>
          <p>Claude peut écrire la légende à partir des stats, sans rien inventer. Téléchargez les images, collez la légende sur le réseau, puis passez le post en « Publié ».</p>
        </>} />

      <section aria-labelledby="h-raconter" className="mb-10">
        <h2 id="h-raconter" className="titre text-xl font-extrabold mb-3">À raconter</h2>
        {aRaconter.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {aRaconter.map((m) => {
              const post = parMatch.get(m.id);
              return (
                <li key={m.id}>
                  <Link href={`/studio/contenu/apres-match/${m.id}`} className="flex items-center gap-3 rounded-2xl bg-surface border border-trait p-4 hover:border-vin">
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-sourdine">{m.competition.short_name ?? m.competition.name} · {quand(m.kickoff_at)}</span>
                      <span className="block font-bold truncate">{nom(m.home)} <span className="tnum text-vin">{m.home_score}-{m.away_score}</span> {nom(m.away)}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${post ? (post.statut === "publie" ? "bg-teinte text-sourdine" : "bg-moutarde text-bordeaux") : "bg-bordeaux text-white"}`}>
                      {post ? LIBELLE[post.statut] : "Créer le post"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sourdine">Aucun match terminé ces quatre derniers jours dans les compétitions suivies.</p>}
      </section>

      <section aria-labelledby="h-posts" className="mb-10">
        <h2 id="h-posts" className="titre text-xl font-extrabold mb-3">Les posts</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {colonnes.map((c) => {
            const items = liste.filter((p) => p.statut === c.id || (c.id === "brouillon" && p.statut === "idee")).slice(0, 12);
            return (
              <div key={c.id} className="bg-surface border border-trait rounded-2xl p-4">
                <h3 className="font-bold mb-2">{c.titre} <span className="text-sourdine font-normal tnum">{items.length}</span></h3>
                {items.length ? (
                  <ul className="grid gap-2">
                    {items.map((p) => (
                      <li key={p.id} className="flex items-start gap-2 text-sm border-t border-trait pt-2 first:border-0 first:pt-0">
                        <Link href={p.match_id ? `/studio/contenu/apres-match/${p.match_id}` : "/studio/contenu"} className="min-w-0 flex-1 hover:text-vin">
                          <span className="block font-semibold truncate">{p.titre}</span>
                          <span className="block text-xs text-sourdine">
                            {p.reseaux.map((r) => RESEAU[r] ?? r).join(", ")}
                            {p.statut === "publie" && p.publie_le ? ` · publié ${quand(p.publie_le)}` : p.prevu_le ? ` · prévu ${quand(p.prevu_le)}` : ""}
                          </span>
                        </Link>
                        {c.id === "pret" && (
                          <form action={changerStatut.bind(null, p.id, "publie")}>
                            <button className="text-xs font-semibold text-vin underline underline-offset-2">Marquer publié</button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-sourdine">{c.vide}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {prochains.length > 0 && (
        <section aria-labelledby="h-prochains">
          <h2 id="h-prochains" className="titre text-xl font-extrabold mb-1">À préparer</h2>
          <p className="text-sm text-sourdine mb-3">Les gros matchs des prochains jours : leur carrousel sera prêt dès le coup de sifflet final.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {prochains.map((m) => (
              <li key={m.id} className="rounded-xl border border-dashed border-trait px-4 py-3 text-sm">
                <span className="text-sourdine">{quand(m.kickoff_at)} · {m.competition.short_name ?? m.competition.name}</span>
                <span className="block font-semibold">{nom(m.home)} – {nom(m.away)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

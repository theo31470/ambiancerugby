import Link from "next/link";
import { createClient, getViewer } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import { IA_PLAFOND_MOIS_USD } from "@/lib/ia";
import { MATCH_SELECT } from "@/lib/queries";
import { fmtRelative, isoFromNow } from "@/lib/format";
import { deleteComment } from "@/app/actions";
import MatchRow from "@/components/MatchRow";
import type { MatchFull } from "@/lib/types";

const QUOTA_JOUR = 7500; // API-Sports PRO
/** Synchro de plus de 36 h : compétition en retard. */
const vieux = (iso: string | null) => !iso || Date.now() - new Date(iso).getTime() > 36 * 3600e3;

export default async function AdminHome() {
  const db = await createClient();
  const count = async (t: string, f?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let q = db.from(t).select("*", { count: "exact", head: true });
    if (f) q = f(q);
    return (await q).count ?? 0;
  };
  const jour = new Date(); jour.setUTCHours(0, 0, 0, 0);
  const il30j = isoFromNow(-30 * 86400e3);

  const [articles, brouillons, inscrits, supporters, attente, joueurs, photos, aCompleter, commentaires7j,
    appels, inscriptions, comps, live, coms, runs] = await Promise.all([
    count("articles", (q) => q.eq("status", "published")),
    count("articles", (q) => q.eq("status", "draft")),
    count("profiles"),
    count("profiles", (q) => q.neq("plan", "free")),
    count("subscription_interest"),
    count("players", (q) => q.eq("in_squad", true)),
    count("players", (q) => q.eq("in_squad", true).not("photo_url", "is", null)),
    count("players", (q) => q.eq("in_squad", true).is("tsdb_checked_at", null)),
    count("comments", (q) => q.gte("created_at", isoFromNow(-7 * 86400e3))),
    db.from("sync_runs").select("calls").eq("provider", "apisports").gte("created_at", jour.toISOString()),
    db.from("profiles").select("created_at").gte("created_at", il30j),
    db.from("competitions").select("id,slug,name,short_name,color,active,last_synced_at,standings_source,current_season").eq("active", true).order("sort_order"),
    db.from("matches").select(MATCH_SELECT).in("status", ["live", "halftime"]).order("kickoff_at").limit(12),
    db.from("comments").select("id, body, created_at, article_id, match_id, author:profiles(display_name, username)").order("created_at", { ascending: false }).limit(8),
    db.from("sync_runs").select("id, created_at, provider, job, ok, message").order("created_at", { ascending: false }).limit(6),
  ]);

  // à faire : matchs récents de Top 14 / Pro D2 sans feuille, clubs sans effectif, dépense Claude
  const [viewer, { data: recents }, { count: sansEffectif }, { data: depenseIA }] = await Promise.all([
    getViewer(),
    db.from("matches").select("id, round, competition:competitions!inner(slug, name)").eq("status", "finished")
      .gte("kickoff_at", isoFromNow(-10 * 86400e3)).in("competition.slug", ["top-14", "pro-d2"]),
    db.from("teams").select("id", { count: "exact", head: true }).eq("is_national", false).not("squad_synced_at", "is", null).lt("squad_count", 12),
    db.rpc("ia_depense_mois"),
  ]);
  const idsRecents = (recents ?? []).map((m) => m.id);
  const { data: saisis } = idsRecents.length ? await db.from("player_match_stats").select("match_id").in("match_id", idsRecents) : { data: [] };
  const faits = new Set((saisis ?? []).map((x) => x.match_id));
  const aSaisir = new Map<string, { nom: string; n: number; journee: string | null }>();
  for (const m of (recents ?? []) as unknown as { id: string; round: string | null; competition: { slug: string; name: string } }[]) {
    if (faits.has(m.id)) continue;
    const e = aSaisir.get(m.competition.slug) ?? { nom: m.competition.name, n: 0, journee: m.round };
    e.n++;
    aSaisir.set(m.competition.slug, e);
  }

  const quota = (appels.data ?? []).reduce((a, r) => a + (r.calls ?? 0), 0);
  const pctQuota = Math.min(100, Math.round((quota / QUOTA_JOUR) * 100));
  // inscriptions des 30 derniers jours, jour par jour
  const parJour = Array.from({ length: 30 }, (_, i) => {
    const d = isoFromNow(-(29 - i) * 86400e3).slice(0, 10);
    return { d, n: (inscriptions.data ?? []).filter((p) => p.created_at.slice(0, 10) === d).length };
  });
  const maxJour = Math.max(1, ...parJour.map((x) => x.n));
  const total30 = parJour.reduce((a, x) => a + x.n, 0);

  const kpis = [
    { label: "Inscrits", value: inscrits, sub: `+${total30} sur 30 jours`, href: "/admin/utilisateurs" },
    { label: "Supporters", value: supporters, sub: `${attente} sur liste d'attente`, href: "/admin/utilisateurs" },
    { label: "Articles en ligne", value: articles, sub: brouillons ? `${brouillons} brouillon${brouillons > 1 ? "s" : ""}` : "aucun brouillon", href: "/admin/articles" },
    { label: "Joueurs", value: joueurs, sub: `${photos} avec photo${aCompleter ? `, ${aCompleter} à compléter` : ""}`, href: "/admin/joueurs" },
    { label: "Commentaires", value: commentaires7j, sub: "sur 7 jours", href: "#moderation" },
  ];

  return (
    <div className="grid gap-8">
      <PageHeader titre={`Salut ${(viewer?.display_name ?? "").split(" ")[0] || "la rédaction"}`}
        description={new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }) + ". Voici ce qui t'attend et l'état du site."}
        actions={<>
          <Link href="/admin/journee" className="bouton">Saisir une journée</Link>
          <Link href="/admin/articles/nouveau" className="bouton-discret">Écrire un article</Link>
        </>} />

      <section aria-labelledby="h-afaire">
        <h2 id="h-afaire" className="text-xl font-bold mb-3">À faire</h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[...aSaisir.entries()].map(([slug, e]) => (
            <li key={slug}>
              <Link href={`/admin/journee?comp=${slug}${e.journee ? `&j=${encodeURIComponent(e.journee)}` : ""}`} className="flex items-start gap-3 bg-surface border-2 border-moutarde rounded-2xl p-4 hover:border-vin carte-vie h-full">
                <span className="groovy text-3xl text-vin leading-none">{e.n}</span>
                <span><span className="font-semibold block">match{e.n > 1 ? "s" : ""} de {e.nom} à saisir</span><span className="text-sm text-sourdine">Claude peut les chercher pour toi</span></span>
              </Link>
            </li>
          ))}
          {brouillons > 0 && (
            <li>
              <Link href="/admin/articles" className="flex items-start gap-3 bg-surface border border-trait rounded-2xl p-4 hover:border-vin carte-vie h-full">
                <span className="groovy text-3xl text-vin leading-none">{brouillons}</span>
                <span><span className="font-semibold block">brouillon{brouillons > 1 ? "s" : ""} à finir</span><span className="text-sm text-sourdine">Articles en attente de publication</span></span>
              </Link>
            </li>
          )}
          {(sansEffectif ?? 0) > 0 && (
            <li>
              <Link href="/admin/donnees#effectifs" className="flex items-start gap-3 bg-surface border border-trait rounded-2xl p-4 hover:border-vin carte-vie h-full">
                <span className="groovy text-3xl text-vin leading-none">{sansEffectif}</span>
                <span><span className="font-semibold block">club{(sansEffectif ?? 0) > 1 ? "s" : ""} sans effectif</span><span className="text-sm text-sourdine">Indiquer leur page Wikipédia ou ajouter les joueurs</span></span>
              </Link>
            </li>
          )}
          {!aSaisir.size && !brouillons && !sansEffectif && (
            <li className="bg-surface border border-trait rounded-2xl p-4 text-sourdine">Rien en attente. Tout est à jour.</li>
          )}
        </ul>
        <p className="mt-3 text-xs text-sourdine tnum">Claude ce mois-ci : {Number(depenseIA ?? 0).toLocaleString("fr-FR", { style: "currency", currency: "USD" })} sur {IA_PLAFOND_MOIS_USD} $ de plafond.</p>
      </section>

      <dl className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="bg-surface border border-trait rounded-2xl p-4 hover:border-vin carte-vie">
            <dt className="text-sm text-sourdine">{k.label}</dt>
            <dd className="titre text-3xl font-extrabold tnum">{k.value}</dd>
            <dd className="text-xs text-sourdine">{k.sub}</dd>
          </Link>
        ))}
      </dl>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="h-inscr" className="bg-surface border border-trait rounded-2xl p-5">
          <h2 id="h-inscr" className="font-bold">Inscriptions, 30 derniers jours</h2>
          <div className="mt-4 h-28 flex items-end gap-[3px]" role="img" aria-label={`${total30} inscriptions sur 30 jours`}>
            {parJour.map((x) => (
              <span key={x.d} title={`${x.d} : ${x.n}`} className="flex-1 rounded-t bg-vin/80 hover:bg-vin min-h-[2px]" style={{ height: `${(x.n / maxJour) * 100}%` }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-sourdine"><span>il y a 30 jours</span><span>aujourd&apos;hui</span></div>
        </section>

        <section aria-labelledby="h-quota" className="bg-bordeaux text-white rounded-2xl p-5">
          <h2 id="h-quota" className="font-bold">API-Sports aujourd&apos;hui</h2>
          <p className="mt-2 groovy text-5xl text-moutarde tnum">{quota.toLocaleString("fr-FR")}</p>
          <p className="text-sm text-white/70">appels sur {QUOTA_JOUR.toLocaleString("fr-FR")} autorisés</p>
          <div className="mt-3 h-3 rounded-full bg-white/15 overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={QUOTA_JOUR} aria-valuenow={quota} aria-label="Quota du jour">
            <div className={`h-full rounded-full ${pctQuota > 85 ? "bg-alerte" : "bg-moutarde"}`} style={{ width: `${Math.max(pctQuota, 1)}%` }} />
          </div>
          <Link href="/admin/donnees" className="mt-4 inline-block text-sm underline underline-offset-4 text-white/80">Synchronisations et effectifs</Link>
        </section>
      </div>

      <section aria-labelledby="h-live">
        <h2 id="h-live" className="text-xl font-bold mb-3">En direct maintenant</h2>
        {(live.data ?? []).length ? (
          <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait overflow-hidden">
            {(live.data as unknown as MatchFull[]).map((m) => (
              <li key={m.id} className="flex items-center">
                <div className="flex-1 min-w-0"><MatchRow m={m} showDate /></div>
                <Link href={`/admin/matchs/${m.id}/stats`} className="bouton-discret mr-3 shrink-0">Feuille</Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sourdine">Aucun match en cours. Les scores se mettent à jour seuls toutes les 2 minutes pendant les matchs.</p>}
      </section>

      <section aria-labelledby="h-sante">
        <h2 id="h-sante" className="text-xl font-bold mb-3">Santé des compétitions</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(comps.data ?? []).map((c) => (
            <li key={c.id} className="flex items-center gap-3 bg-surface border border-trait rounded-xl px-3 py-2.5">
              <span className="w-2 self-stretch rounded-sm" style={{ background: c.color ?? "var(--vin)" }} aria-hidden />
              <span className="min-w-0 flex-1">
                <Link href={`/competitions/${c.slug}`} className="font-semibold hover:underline underline-offset-4 block truncate">{c.short_name ?? c.name}</Link>
                <span className="text-xs text-sourdine block">
                  {c.last_synced_at ? `à jour ${fmtRelative(c.last_synced_at)}` : "jamais synchronisée"}
                  {c.standings_source === "calcul" ? ", classement calculé" : c.standings_source === "api" ? ", classement officiel" : ""}
                </span>
              </span>
              <span aria-label={vieux(c.last_synced_at) ? "En retard" : "À jour"} className={`w-2.5 h-2.5 rounded-full shrink-0 ${vieux(c.last_synced_at) ? "bg-alerte" : "bg-ok"}`} />
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section id="moderation" aria-labelledby="h-coms" className="scroll-mt-24">
          <h2 id="h-coms" className="text-xl font-bold mb-3">Derniers commentaires</h2>
          {(coms.data ?? []).length ? (
            <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait">
              {(coms.data as unknown as { id: string; body: string; created_at: string; article_id: string | null; match_id: string | null; author: { display_name: string | null; username: string | null } | null }[]).map((c) => (
                <li key={c.id} className="p-3 flex gap-3 items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm"><span className="font-semibold">{c.author?.display_name ?? c.author?.username ?? "Anonyme"}</span> <span className="text-sourdine">{fmtRelative(c.created_at)}</span></p>
                    <p className="text-sm mt-0.5 line-clamp-2">{c.body}</p>
                    {c.match_id && <Link href={`/matchs/${c.match_id}`} className="text-xs text-vin underline underline-offset-2">Voir le match</Link>}
                  </div>
                  <form action={deleteComment}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="path" value="/admin" />
                    <button className="text-xs font-semibold text-alerte hover:underline">Supprimer</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : <p className="text-sourdine">Aucun commentaire pour l&apos;instant.</p>}
        </section>

        <section aria-labelledby="h-runs">
          <h2 id="h-runs" className="text-xl font-bold mb-3">Journal des synchronisations</h2>
          <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait text-sm">
            {(runs.data ?? []).map((r) => (
              <li key={r.id} className="p-3">
                <p className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${r.ok ? "bg-ok" : "bg-alerte"}`} aria-hidden />
                  <span className="font-semibold">{r.job}</span>
                  <span className="text-sourdine">{r.provider}, {fmtRelative(r.created_at)}</span>
                </p>
                <p className="text-xs text-sourdine mt-0.5 line-clamp-2">{r.message}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

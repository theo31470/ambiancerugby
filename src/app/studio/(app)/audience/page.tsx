import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";

export const metadata: Metadata = { title: "Audience" };
export const dynamic = "force-dynamic";

type Ligne = { nom: string; n: number; v?: number; pages?: number; canal?: string; pays?: string };
type Audience = {
  debut: string;
  resume: { visites: number; visiteurs: number; pages: number; pages_par_visite: number | null; duree_moy_s: number | null; rebond: number | null; app: number | null; connectes: number | null };
  precedent: { visites: number; visiteurs: number; pages: number };
  en_ligne: number;
  serie: { t: string; visiteurs: number; pages: number }[];
  canaux: Ligne[]; sources: Ligne[]; campagnes: Ligne[]; pages_top: Ligne[]; entrees: Ligne[];
  appareils: Ligne[]; os: Ligne[]; navigateurs: Ligne[]; pays: Ligne[]; villes: Ligne[]; heures: number[];
};

const PERIODES = { "1": "24 heures", "7": "7 jours", "30": "30 jours", "90": "90 jours", "365": "12 mois" } as const;
type Periode = keyof typeof PERIODES;

const COULEUR_CANAL: Record<string, string> = {
  TikTok: "#111111", Instagram: "#c13584", Facebook: "#1877f2", X: "#444444", Google: "#ea4335", "Autres moteurs": "#7a8b3a",
  Direct: "var(--vin)", "E-mail": "#c08a00", "Autres sites": "#8a6d5b", Campagnes: "#d18a2c", YouTube: "#ff0000", WhatsApp: "#25d366", Snapchat: "#d9c700",
};
const PAYS = new Intl.DisplayNames(["fr"], { type: "region" });
const nb = (n: number) => n.toLocaleString("fr-FR");
const pct = (n: number, t: number) => (t ? Math.round((100 * n) / t) : 0);

function Evolution({ maintenant, avant }: { maintenant: number; avant: number }) {
  if (!avant) return <span className="text-xs text-sourdine">nouveau</span>;
  const e = Math.round(((maintenant - avant) / avant) * 100);
  return <span className={`text-xs font-semibold ${e >= 0 ? "text-ok" : "text-vin"}`}>{e >= 0 ? "+" : ""}{e} % vs période précédente</span>;
}

function Chiffre({ titre, valeur, detail }: { titre: string; valeur: string; detail?: React.ReactNode }) {
  return (
    <div className="bg-surface border border-trait rounded-2xl p-4">
      <p className="text-sm text-sourdine">{titre}</p>
      <p className="titre font-extrabold text-3xl tnum mt-0.5">{valeur}</p>
      {detail && <div className="mt-1">{detail}</div>}
    </div>
  );
}

function Barres({ titre, lignes, total, couleur, libelle, vide = "Rien pour l'instant." }: { titre: string; lignes: Ligne[]; total: number; couleur?: (l: Ligne) => string; libelle?: (l: Ligne) => React.ReactNode; vide?: string }) {
  return (
    <section className="bg-surface border border-trait rounded-2xl p-5">
      <h2 className="titre font-bold text-lg">{titre}</h2>
      {!lignes.length ? <p className="mt-3 text-sm text-sourdine">{vide}</p> : (
        <ul className="mt-3 grid gap-2">
          {lignes.map((l) => (
            <li key={`${l.nom}-${l.pays ?? ""}`} className="relative">
              <div className="absolute inset-y-0 left-0 rounded-md opacity-15" style={{ width: `${Math.max(2, pct(l.n, lignes[0].n))}%`, background: couleur?.(l) ?? "var(--vin)" }} />
              <div className="relative flex items-center gap-3 px-2 py-1 text-sm">
                <span className="flex-1 min-w-0 truncate">{libelle ? libelle(l) : l.nom}</span>
                <span className="tnum font-semibold">{nb(l.n)}</span>
                <span className="tnum text-sourdine w-10 text-right">{pct(l.n, total)} %</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Courbe({ serie, parHeure }: { serie: Audience["serie"]; parHeure: boolean }) {
  const max = Math.max(1, ...serie.map((p) => p.visiteurs));
  const L = 100 / Math.max(1, serie.length);
  const etiquette = (t: string) => new Date(t).toLocaleString("fr-FR", parHeure ? { hour: "2-digit", timeZone: "Europe/Paris" } : { day: "numeric", month: "short", timeZone: "Europe/Paris" });
  const pas = Math.ceil(serie.length / 8);
  return (
    <figure className="bg-surface border border-trait rounded-2xl p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="titre font-bold text-lg">Visiteurs {parHeure ? "par heure" : "par jour"}</span>
        <span className="text-xs text-sourdine">Max {nb(max)}</span>
      </figcaption>
      <div className="mt-4 flex h-48 items-end gap-[2px]" role="img" aria-label={`Visiteurs ${parHeure ? "par heure" : "par jour"}`}>
        {serie.map((p) => (
          <div key={p.t} className="group relative flex-1 h-full flex items-end" style={{ minWidth: 0, flexBasis: `${L}%` }}>
            <div className="w-full rounded-t bg-vin/80 group-hover:bg-vin transition-colors" style={{ height: `${(p.visiteurs / max) * 100}%`, minHeight: p.visiteurs ? 2 : 0 }} />
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded-md bg-encre text-fond text-xs px-2 py-1 z-10">
              {etiquette(p.t)} : {nb(p.visiteurs)} visiteurs, {nb(p.pages)} pages
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-sourdine">
        {serie.map((p, i) => <span key={p.t} className="flex-1 min-w-0 text-center truncate">{i % pas === 0 ? etiquette(p.t) : ""}</span>)}
      </div>
    </figure>
  );
}

function Heures({ heures }: { heures: number[] }) {
  const max = Math.max(1, ...heures);
  return (
    <section className="bg-surface border border-trait rounded-2xl p-5">
      <h2 className="titre font-bold text-lg">À quelle heure ils arrivent</h2>
      <div className="mt-4 grid grid-cols-12 sm:grid-cols-24 gap-1">
        {heures.map((n, h) => (
          <div key={h} className="text-center" title={`${h} h : ${n} visites`}>
            <div className="h-10 rounded-md bg-vin" style={{ opacity: 0.08 + 0.92 * (n / max) }} />
            <span className="text-[10px] text-sourdine tnum">{h}h</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function AudiencePage({ searchParams }: PageProps<"/studio/audience">) {
  const sp = await searchParams;
  const periode: Periode = typeof sp.p === "string" && sp.p in PERIODES ? (sp.p as Periode) : "30";
  const db = await createClient();
  const { data, error } = await db.rpc("audience", { p_jours: Number(periode) });
  const a = data as Audience | null;

  return (
    <div className="grid gap-6">
      <PageHeader titre="Audience"
        description="Qui vient sur le site et l'app, d'où ils arrivent et ce qu'ils regardent."
        actions={<span className="inline-flex items-center gap-2 rounded-full bg-surface border border-trait px-3 py-1.5 text-sm font-semibold"><span className="w-2 h-2 rounded-full bg-ok animate-pulse" />{nb(a?.en_ligne ?? 0)} en ce moment</span>}
        aide={<>
          <p>Mesure maison, sans cookie : rien n&apos;est enregistré sur le téléphone des visiteurs, donc pas de bandeau à afficher. Les robots et la rédaction connectée ne sont pas comptés.</p>
          <p>Un visiteur est reconnu à la journée, sans pouvoir être identifié : quelqu&apos;un qui revient le lendemain compte à nouveau. Une visite s&apos;arrête après 30 minutes sans activité.</p>
          <p>Canaux : les liens ouverts depuis TikTok, Instagram ou Facebook sont reconnus même sans site d&apos;origine. Pour suivre une publication précise, ajoutez par exemple <code>?utm_source=tiktok&amp;utm_campaign=bio</code> au lien.</p>
          <p>Les données sont gardées 13 mois.</p>
        </>} />

      <nav aria-label="Période" className="flex flex-wrap gap-1.5 text-sm font-semibold">
        {(Object.keys(PERIODES) as Periode[]).map((p) => (
          <Link key={p} href={`/studio/audience?p=${p}`} aria-current={p === periode ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 border ${p === periode ? "bg-bordeaux text-white border-bordeaux" : "border-trait bg-surface hover:border-vin"}`}>{PERIODES[p]}</Link>
        ))}
      </nav>

      {error || !a ? (
        <p className="bg-surface border border-trait rounded-2xl p-5 text-sourdine">Les statistiques n&apos;ont pas pu être chargées. Réessayez dans un instant.</p>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Chiffre titre="Visiteurs" valeur={nb(a.resume.visiteurs)} detail={<Evolution maintenant={a.resume.visiteurs} avant={a.precedent.visiteurs} />} />
            <Chiffre titre="Visites" valeur={nb(a.resume.visites)} detail={<Evolution maintenant={a.resume.visites} avant={a.precedent.visites} />} />
            <Chiffre titre="Pages vues" valeur={nb(a.resume.pages)} detail={<Evolution maintenant={a.resume.pages} avant={a.precedent.pages} />} />
            <Chiffre titre="Pages par visite" valeur={String(a.resume.pages_par_visite ?? 0).replace(".", ",")} detail={<span className="text-xs text-sourdine">{a.resume.rebond ?? 0} % ne voient qu&apos;une page</span>} />
            <Chiffre titre="Temps moyen" valeur={a.resume.duree_moy_s ? `${Math.floor(a.resume.duree_moy_s / 60)} min ${String(a.resume.duree_moy_s % 60).padStart(2, "0")}` : "—"} detail={<span className="text-xs text-sourdine">sur les visites de plus d&apos;une page</span>} />
            <Chiffre titre="Depuis l'app installée" valeur={`${a.resume.app ?? 0} %`} detail={<span className="text-xs text-sourdine">des visites</span>} />
            <Chiffre titre="Membres connectés" valeur={`${a.resume.connectes ?? 0} %`} detail={<span className="text-xs text-sourdine">des visites</span>} />
            <Chiffre titre="Sur mobile" valeur={`${pct(a.appareils.find((x) => x.nom === "Mobile")?.n ?? 0, a.resume.visites)} %`} detail={<span className="text-xs text-sourdine">des visites</span>} />
          </div>

          <Courbe serie={a.serie} parHeure={periode === "1"} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Barres titre="Canaux d'arrivée" lignes={a.canaux} total={a.resume.visites} couleur={(l) => COULEUR_CANAL[l.nom] ?? "var(--vin)"}
              libelle={(l) => <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COULEUR_CANAL[l.nom] ?? "var(--vin)" }} />{l.nom}<span className="text-xs text-sourdine">{l.pages && l.n ? `${String(Math.round((l.pages / l.n) * 10) / 10).replace(".", ",")} pages/visite` : ""}</span></span>} />
            <Barres titre="Sites et sources" lignes={a.sources} total={a.resume.visites} couleur={(l) => COULEUR_CANAL[l.canal ?? ""] ?? "var(--vin)"} vide="Aucune source extérieure pour l'instant." />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Barres titre="Pages les plus vues" lignes={a.pages_top} total={a.resume.pages}
              libelle={(l) => <a href={l.nom} target="_blank" rel="noopener" className="hover:text-vin hover:underline">{l.nom === "/" ? "Accueil" : l.nom}</a>} />
            <div className="grid gap-6 content-start">
              <Barres titre="Pages d'arrivée" lignes={a.entrees} total={a.resume.visites} libelle={(l) => (l.nom === "/" ? "Accueil" : l.nom)} />
              {a.campagnes.length > 0 && <Barres titre="Campagnes (utm_campaign)" lignes={a.campagnes} total={a.resume.visiteurs} />}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Barres titre="Appareils" lignes={a.appareils} total={a.resume.visites} />
            <Barres titre="Systèmes" lignes={a.os} total={a.os.reduce((s, x) => s + x.n, 0)} />
            <Barres titre="Navigateurs" lignes={a.navigateurs} total={a.navigateurs.reduce((s, x) => s + x.n, 0)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Barres titre="Pays" lignes={a.pays} total={a.resume.visites} libelle={(l) => { try { return PAYS.of(l.nom) ?? l.nom; } catch { return l.nom; } }} />
            <Barres titre="Villes" lignes={a.villes} total={a.resume.visites} />
          </div>

          <Heures heures={a.heures} />
        </>
      )}
    </div>
  );
}

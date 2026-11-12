"use client";
/* eslint-disable @next/next/no-img-element */
import { useActionState, useState, useTransition } from "react";
import { enregistrerPost, redigerLegende, type EtatPost } from "@/app/studio/(app)/contenu/actions";

const RESEAUX = [
  { id: "instagram", label: "Instagram" }, { id: "facebook", label: "Facebook" }, { id: "x", label: "X" },
  { id: "tiktok", label: "TikTok" }, { id: "linkedin", label: "LinkedIn" },
];
const STATUTS = [
  { id: "idee", label: "Idée" }, { id: "brouillon", label: "Brouillon" }, { id: "pret", label: "Prêt à publier" }, { id: "publie", label: "Publié" },
];

type Existant = { titre: string; legende: string | null; reseaux: string[]; statut: string; prevu_le: string | null } | null;

/** Post d'après-match : les 5 images générées depuis les données du site, la légende (Claude peut l'écrire) et sa planification. */
export default function EditeurPost({ matchId, titre, slides, existant }: { matchId: string; titre: string; slides: readonly string[]; existant: Existant }) {
  const [etat, envoyer, envoi] = useActionState<EtatPost, FormData>(enregistrerPost, { ok: false, message: "" });
  const [legende, setLegende] = useState(existant?.legende ?? "");
  const [ia, setIa] = useState<string | null>(null);
  const [redaction, lancer] = useTransition();
  const [copie, setCopie] = useState(false);
  const [version, setVersion] = useState(0);
  const src = (n: number, dl = false) => `/api/visuels/apres-match/${matchId}?slide=${n}${dl ? "&dl=1" : ""}&v=${version}`;
  const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <section aria-labelledby="h-images">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 id="h-images" className="titre text-xl font-extrabold">Les images</h2>
          <button type="button" className="bouton-discret text-sm" onClick={() => setVersion((v) => v + 1)}>Régénérer avec les dernières données</button>
        </div>
        <ol className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {slides.map((nom, i) => (
            <li key={nom} className="grid gap-2">
              <a href={src(i + 1)} target="_blank" rel="noopener" className="block rounded-xl overflow-hidden border border-trait bg-teinte aspect-[4/5]">
                <img src={src(i + 1)} alt={`${i + 1}. ${nom}`} loading="lazy" className="w-full h-full object-cover" />
              </a>
              <span className="flex items-center justify-between text-sm">
                <span><b className="tnum">{i + 1}.</b> {nom}</span>
                <a href={src(i + 1, true)} className="text-vin font-semibold underline underline-offset-2">Télécharger</a>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-sourdine">Format 1080 × 1350 (portrait Instagram). Les images se recalculent à chaque ouverture : notes, fil du match et Indice inclus.</p>
      </section>

      <form action={envoyer} className="grid gap-4 content-start bg-surface border border-trait rounded-2xl p-5">
        <input type="hidden" name="match_id" value={matchId} />
        <input type="hidden" name="titre" value={existant?.titre ?? titre} />
        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="legende" className="etiquette">Légende</label>
            <button type="button" className="bouton-discret text-sm" disabled={redaction}
              onClick={() => lancer(async () => {
                setIa(null);
                const r = await redigerLegende(matchId);
                if (r.ok && r.texte) setLegende(r.texte); else setIa(r.message ?? "Échec de la rédaction.");
              })}>
              {redaction ? "Claude écrit…" : legende ? "Réécrire avec Claude" : "Rédiger avec Claude"}
            </button>
          </div>
          <textarea id="legende" name="legende" rows={12} value={legende} onChange={(e) => setLegende(e.target.value)} className="champ font-normal" placeholder="Écrivez la légende, ou laissez Claude la rédiger à partir des stats du match." />
          <div className="mt-1 flex justify-between text-xs text-sourdine">
            <span>{ia ? <span className="text-alerte">{ia}</span> : "Claude n'utilise que les données du site. Relisez avant de publier."}</span>
            <span className="tnum">{legende.length} / 2 200</span>
          </div>
          <button type="button" className="mt-2 text-sm text-vin font-semibold underline underline-offset-2" disabled={!legende}
            onClick={() => { navigator.clipboard.writeText(legende).then(() => { setCopie(true); setTimeout(() => setCopie(false), 1500); }); }}>
            {copie ? "Légende copiée" : "Copier la légende"}
          </button>
        </div>

        <fieldset>
          <legend className="etiquette">Réseaux</legend>
          <div className="flex flex-wrap gap-2">
            {RESEAUX.map((r) => (
              <label key={r.id} className="flex items-center gap-1.5 rounded-full border border-trait px-3 py-1 text-sm has-[:checked]:bg-bordeaux has-[:checked]:text-white has-[:checked]:border-bordeaux cursor-pointer">
                <input type="checkbox" name="reseaux" value={r.id} defaultChecked={(existant?.reseaux ?? ["instagram"]).includes(r.id)} className="sr-only" />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="statut" className="etiquette">Statut</label>
            <select id="statut" name="statut" defaultValue={existant?.statut ?? "brouillon"} className="champ">
              {STATUTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="prevu_le" className="etiquette">Publication prévue</label>
            <input id="prevu_le" name="prevu_le" type="datetime-local" defaultValue={local(existant?.prevu_le ?? null)} className="champ" />
          </div>
        </div>

        <button type="submit" className="bouton justify-center" disabled={envoi}>{envoi ? "Enregistrement…" : "Enregistrer le post"}</button>
        {etat.message && <p role="status" className={`text-sm ${etat.ok ? "text-vin" : "text-alerte"}`}>{etat.message}</p>}
      </form>
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { chercherMatchIA, type EtatRecherche } from "@/app/admin/ia-actions";

type MatchCible = { id: string; label: string; saisi: boolean };

const STYLE: Record<EtatRecherche["etat"], string> = {
  valide: "bg-ok/15 text-ok",
  proposition: "bg-moutarde/25 text-encre",
  deja: "bg-moutarde/25 text-encre",
  rien: "bg-teinte text-sourdine",
  erreur: "bg-alerte/15 text-alerte",
};
const MOT: Record<EtatRecherche["etat"], string> = { valide: "Enregistré", proposition: "À vérifier", deja: "À comparer", rien: "Rien trouvé", erreur: "Erreur" };

/** Lance Claude sur toute une journée : il cherche les comptes rendus et remplit les matchs un par un. */
export default function RechercheJournee({ matchs, lien }: { matchs: MatchCible[]; lien: string }) {
  const router = useRouter();
  const [auto, setAuto] = useState(true);
  const [aussiSaisis, setAussiSaisis] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [res, setRes] = useState<Record<string, EtatRecherche>>({});
  const cibles = matchs.filter((m) => aussiSaisis || !m.saisi);

  async function lancer() {
    for (const m of cibles) {
      setEnCours(m.id);
      const r = await chercherMatchIA(m.id, auto);
      setRes((x) => ({ ...x, [m.id]: r }));
    }
    setEnCours(null);
    router.refresh();
  }

  if (!matchs.length) return null;
  return (
    <section aria-labelledby="h-ia" className="rounded-2xl bg-bordeaux text-white p-5">
      <h2 id="h-ia" className="titre font-extrabold text-xl">Remplir la journée avec Claude</h2>
      <p className="mt-1 text-sm text-white/80 max-w-prose">
        Claude cherche le compte rendu de chaque match dans la presse et relève marqueurs et cartons. Environ 4 centimes par match.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} disabled={!!enCours} />
          Enregistrer seul quand tout colle au score officiel</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={aussiSaisis} onChange={(e) => setAussiSaisis(e.target.checked)} disabled={!!enCours} />
          Inclure les matchs déjà saisis</label>
      </div>
      <button onClick={lancer} disabled={!!enCours || !cibles.length} className="mt-4 bouton-or disabled:opacity-60">
        {enCours ? "Claude cherche…" : cibles.length ? `Chercher ${cibles.length} match${cibles.length > 1 ? "s" : ""}` : "Tous les matchs sont déjà saisis"}
      </button>
      {(enCours || Object.keys(res).length > 0) && (
        <ul className="mt-4 grid gap-1.5 text-sm" aria-live="polite">
          {cibles.map((m) => {
            const r = res[m.id];
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <span className="font-semibold">{m.label}</span>
                {r ? (
                  <>
                    <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${STYLE[r.etat]}`}>{MOT[r.etat]}</span>
                    <span className="text-white/80">{r.message}</span>
                    {r.propId && <a href={`${lien}&ia=${r.propId}#m-${m.id}`} className="ml-auto underline underline-offset-2 font-semibold">Vérifier</a>}
                  </>
                ) : enCours === m.id ? <span className="text-white/70 animate-pulse">recherche en cours…</span> : <span className="text-white/50">en attente</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Bouton d'un seul match : Claude cherche sur le web puis ouvre sa proposition. */
export function RechercheMatch({ matchId, lien }: { matchId: string; lien: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<EtatRecherche | null>(null);
  const [enCours, setEnCours] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="bouton-discret" disabled={enCours} onClick={async () => {
        setEnCours(true);
        const r = await chercherMatchIA(matchId, false);
        setEnCours(false);
        setEtat(r);
        if (r.propId) router.push(`${lien}&ia=${r.propId}#m-${matchId}`);
        else router.refresh();
      }}>
        {enCours ? "Claude cherche…" : "Chercher sur le web"}
      </button>
      {etat && !etat.propId && <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${STYLE[etat.etat]}`}>{etat.message}</span>}
    </div>
  );
}

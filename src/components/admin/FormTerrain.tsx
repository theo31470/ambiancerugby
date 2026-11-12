"use client";
import { useActionState } from "react";
import { recupererTerrain } from "@/app/studio/(app)/contenu/actions";

/** Récupération du fil Sportradar d'un match, pour la carte du terrain (une requête du quota). */
export default function FormTerrain({ matchId, dejaLa, srId }: { matchId: string; dejaLa: number | null; srId: string | null }) {
  const [etat, envoyer, envoi] = useActionState(recupererTerrain, { ok: false, message: "" });
  return (
    <form action={envoyer} className="mt-8 bg-surface border border-trait rounded-2xl p-5 grid gap-3 max-w-xl">
      <h2 className="titre text-xl font-extrabold">Carte du terrain</h2>
      <p className="text-sm text-sourdine">
        {dejaLa ? `Fil déjà récupéré : ${dejaLa} actions placées. La carte est visible sur la page du match.` : "Récupère le fil positionné du match chez Sportradar (une requête sur le quota de l'essai)."}
      </p>
      <input type="hidden" name="match_id" value={matchId} />
      <label className="grid gap-1">
        <span className="etiquette">Identifiant Sportradar du match</span>
        <input name="sr_id" required defaultValue={srId ?? ""} placeholder="sr:sport_event:71184184" className="champ" pattern="sr:sport_event:\d+" />
      </label>
      <button type="submit" className="bouton justify-center" disabled={envoi}>{envoi ? "Récupération…" : dejaLa ? "Récupérer à nouveau" : "Récupérer le fil"}</button>
      {etat.message && <p role="status" className={`text-sm ${etat.ok ? "text-vin" : "text-alerte"}`}>{etat.message}</p>}
    </form>
  );
}

import { saveMatch, deleteMatch } from "@/app/studio/(app)/actions";
import { Field, Select } from "./Field";
import { STATUS_LABEL, isoToParisLocal } from "@/lib/format";
import type { Match } from "@/lib/types";

export default function MatchForm({ match, competitions, teams, back, defaultCompetition }: {
  match?: Match; competitions: { id: string; name: string; current_season: string }[]; teams: { id: string; name: string }[]; back: string; defaultCompetition?: string;
}) {
  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));
  return (
    <>
      <form action={saveMatch} className="grid gap-5">
        {match && <input type="hidden" name="id" value={match.id} />}
        <input type="hidden" name="_back" value={back} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select name="competition_id" label="Compétition" required defaultValue={match?.competition_id ?? defaultCompetition} options={competitions.map((c) => ({ value: c.id, label: c.name }))} />
          <Field name="season" label="Saison" defaultValue={match?.season} hint="Vide = saison en cours" />
          <Field name="round" label="Journée ou tour" defaultValue={match?.round} placeholder="ex. 9, Demi-finale" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select name="home_team_id" label="Équipe à domicile" required empty="Choisir" defaultValue={match?.home_team_id} options={teamOptions} />
          <Select name="away_team_id" label="Équipe à l'extérieur" required empty="Choisir" defaultValue={match?.away_team_id} options={teamOptions} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="kickoff_at" type="datetime-local" label="Coup d'envoi (heure de Paris)" required defaultValue={match ? isoToParisLocal(match.kickoff_at) : ""} />
          <Field name="venue" label="Stade" defaultValue={match?.venue} />
          <Field name="tv" label="Diffusion" defaultValue={match?.tv} placeholder="ex. Canal+" />
        </div>
        <fieldset className="grid gap-4 grid-cols-2 sm:grid-cols-5 items-end">
          <legend className="etiquette">Score</legend>
          <Field name="home_score" type="number" label="Points dom." defaultValue={match?.home_score} />
          <Field name="away_score" type="number" label="Points ext." defaultValue={match?.away_score} />
          <Field name="home_tries" type="number" label="Essais dom." defaultValue={match?.home_tries} />
          <Field name="away_tries" type="number" label="Essais ext." defaultValue={match?.away_tries} />
          <Select name="status" label="Statut" defaultValue={match?.status ?? "scheduled"} options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
        </fieldset>
        <p className="text-xs text-sourdine -mt-2">Les essais servent au bonus offensif du classement (3 essais de plus que l&apos;adversaire).</p>
        <div><button className="bouton">Enregistrer le match</button></div>
      </form>
      {match && (
        <form action={deleteMatch} className="mt-8 border-t border-trait pt-6">
          <input type="hidden" name="id" value={match.id} />
          <input type="hidden" name="_back" value={back} />
          <button className="text-sm font-semibold text-alerte underline underline-offset-4">Supprimer ce match</button>
        </form>
      )}
    </>
  );
}

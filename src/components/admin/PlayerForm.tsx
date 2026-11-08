/* eslint-disable @next/next/no-img-element */
import { savePlayer, deletePlayer } from "@/app/admin/actions";
import { Area, Field, Select } from "./Field";
import { POSITIONS } from "@/lib/format";
import type { Player } from "@/lib/types";

export default function PlayerForm({ player, teams, back, defaultTeam }: { player?: Player; teams: { id: string; name: string }[]; back: string; defaultTeam?: string }) {
  return (
    <>
      <form action={savePlayer} className="grid gap-5">
        {player && <input type="hidden" name="id" value={player.id} />}
        <input type="hidden" name="_back" value={back} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="first_name" label="Prénom" required defaultValue={player?.first_name} />
          <Field name="last_name" label="Nom" required defaultValue={player?.last_name} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select name="team_id" label="Club" empty="Sans club" defaultValue={player?.team_id ?? defaultTeam} options={teams.map((t) => ({ value: t.id, label: t.name }))} />
          <Select name="position" label="Poste" empty="Non renseigné" defaultValue={player?.position} options={Object.entries(POSITIONS).map(([value, label]) => ({ value, label }))} />
          <Field name="number" type="number" label="Numéro habituel" defaultValue={player?.number} />
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <Field name="nationality" label="Nationalité" defaultValue={player?.nationality} />
          <Field name="birth_date" type="date" label="Date de naissance" defaultValue={player?.birth_date} />
          <Field name="height_cm" type="number" label="Taille (cm)" defaultValue={player?.height_cm} />
          <Field name="weight_kg" type="number" label="Poids (kg)" defaultValue={player?.weight_kg} />
        </div>
        <div className="grid gap-4 grid-cols-3">
          <Field name="caps" type="number" label="Sélections" defaultValue={player?.caps} />
          <Field name="career_tries" type="number" label="Essais en carrière" defaultValue={player?.career_tries} />
          <Field name="career_points" type="number" label="Points en carrière" defaultValue={player?.career_points} />
        </div>
        <fieldset className="grid gap-3 sm:grid-cols-[auto_1fr_1fr] items-end">
          <legend className="etiquette">Photo</legend>
          {player?.photo_url && <img src={player.photo_url} alt="" className="w-16 h-16 rounded-full object-cover" />}
          <div>
            <label htmlFor="photo_file" className="text-sm text-sourdine">Envoyer un fichier (4 Mo max.)</label>
            <input id="photo_file" name="photo_file" type="file" accept="image/*" className="champ mt-1" />
          </div>
          <Field name="photo_url" label="ou adresse de l'image" defaultValue={player?.photo_url} hint="Utilisez une photo dont vous avez les droits." />
        </fieldset>
        <Area name="bio" label="Biographie" rows={5} defaultValue={player?.bio} />
        <Field name="wiki_title" label="Page Wikipédia (anglais)" defaultValue={(player as Player & { wiki_title?: string | null })?.wiki_title} hint="Sert à importer son parcours en carrière." />
        <fieldset className="grid gap-2">
          <legend className="etiquette">Statut</legend>
          <input type="hidden" name="verrou_present" value="1" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="in_squad" defaultChecked={(player as Player & { in_squad?: boolean })?.in_squad ?? true} /> Dans l&apos;effectif actuel de son club</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="verrou" defaultChecked={(player as Player & { verrou?: boolean })?.verrou ?? true} /> Verrouillé : la synchro automatique (Wikipédia, TheSportsDB) ne modifie plus ce joueur</label>
        </fieldset>
        <Field name="slug" label="Adresse de la page" defaultValue={player?.slug} hint="Laissez vide pour la créer depuis le nom." />
        <div><button className="bouton">Enregistrer</button></div>
      </form>
      {player && (
        <form action={deletePlayer} className="mt-8 border-t border-trait pt-6">
          <input type="hidden" name="id" value={player.id} />
          <input type="hidden" name="_back" value={back} />
          <button className="text-sm font-semibold text-alerte underline underline-offset-4">Supprimer ce joueur</button>
        </form>
      )}
    </>
  );
}

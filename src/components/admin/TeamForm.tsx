import { saveTeam } from "@/app/studio/(app)/actions";
import { Area, Field } from "./Field";
import TeamBadge from "@/components/TeamBadge";
import type { Team } from "@/lib/types";

export default function TeamForm({ team, competitions, inComps, back }: {
  team?: Team; competitions: { id: string; name: string; current_season: string }[]; inComps: string[]; back: string;
}) {
  return (
    <form action={saveTeam} className="grid gap-5">
      {team && <input type="hidden" name="id" value={team.id} />}
      <input type="hidden" name="_back" value={back} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="name" label="Nom complet" required defaultValue={team?.name} className="sm:col-span-2" />
        <Field name="short_name" label="Nom court" defaultValue={team?.short_name} placeholder="ex. Toulouse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field name="abbreviation" label="Sigle" defaultValue={team?.abbreviation} placeholder="ex. ST" />
        <Field name="city" label="Ville" defaultValue={team?.city} />
        <Field name="country" label="Pays" defaultValue={team?.country ?? "France"} />
        <Field name="founded" type="number" label="Fondé en" defaultValue={team?.founded} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="stadium" label="Stade" defaultValue={team?.stadium} className="sm:col-span-2" />
        <div>
          <label htmlFor="color" className="etiquette">Couleur principale</label>
          <input id="color" name="color" type="color" defaultValue={team?.color ?? "#934f5e"} className="h-10 w-20 rounded border border-trait bg-surface" />
        </div>
      </div>
      <fieldset className="grid gap-3 sm:grid-cols-[auto_1fr_1fr] items-end">
        <legend className="etiquette">Logo</legend>
        {team && <TeamBadge team={team} size="lg" />}
        <div>
          <label htmlFor="logo_file" className="text-sm text-sourdine">Envoyer un fichier</label>
          <input id="logo_file" name="logo_file" type="file" accept="image/*" className="champ mt-1" />
        </div>
        <Field name="logo_url" label="ou adresse de l'image" defaultValue={team?.logo_url} />
      </fieldset>
      <Area name="description" label="Présentation" rows={4} defaultValue={team?.description} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="wiki_title" label="Page Wikipédia (anglais) de l'effectif" defaultValue={(team as Team & { wiki_title?: string | null })?.wiki_title} hint="Ex. « Stade Toulousain ». Sert à créer et mettre à jour les joueurs chaque lundi." />
        <Field name="slug" label="Adresse de la page" defaultValue={team?.slug} hint="Changez-la seulement si nécessaire : les anciens liens ne marcheront plus." />
      </div>
      <Field name="aliases" label="Autres noms" defaultValue={team?.aliases?.join(", ")}
        hint="Séparés par des virgules. Servent à reconnaître l'équipe dans les données automatiques (ex. Toulouse, Stade Toulousain Rugby)." />
      <fieldset>
        <legend className="etiquette">Compétitions cette saison</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {competitions.map((c) => (
            <label key={c.id} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="competitions" value={c.id} defaultChecked={inComps.includes(c.id)} />
              {c.name} <span className="text-sourdine">{c.current_season}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_national" defaultChecked={team?.is_national} /> Sélection nationale
      </label>
      <div><button className="bouton">Enregistrer</button></div>
    </form>
  );
}

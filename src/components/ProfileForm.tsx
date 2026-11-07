"use client";
import { useActionState } from "react";
import { updateProfile } from "@/app/actions";
import type { Viewer } from "@/lib/supabase/server";

export default function ProfileForm({ viewer, teams }: { viewer: Viewer; teams: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="grid gap-4">
      <div>
        <label htmlFor="display_name" className="etiquette">Nom affiché</label>
        <input id="display_name" name="display_name" defaultValue={viewer.display_name ?? ""} maxLength={40} className="champ" />
      </div>
      <div>
        <label htmlFor="username" className="etiquette">Pseudo</label>
        <input id="username" name="username" defaultValue={viewer.username ?? ""} maxLength={30} className="champ" />
      </div>
      <div>
        <label htmlFor="favorite_team_id" className="etiquette">Mon club de cœur</label>
        <select id="favorite_team_id" name="favorite_team_id" defaultValue={viewer.favorite_team_id ?? ""} className="champ">
          <option value="">Aucun</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      {state?.error && <p role="alert" className="text-sm text-alerte">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-ok">{state.ok}</p>}
      <button className="bouton" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

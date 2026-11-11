"use client";
import { useActionState } from "react";
import { creerLigue, rejoindreLigue } from "@/app/(site)/pronos/actions";

export function RejoindreLigue() {
  const [state, action, pending] = useActionState(rejoindreLigue, undefined);
  return (
    <form action={action} className="flex gap-2">
      <input name="code" required maxLength={6} placeholder="CODE" aria-label="Code de la ligue" className="champ uppercase tracking-widest font-bold" />
      <button className="bouton shrink-0" disabled={pending}>{pending ? "…" : "Rejoindre"}</button>
      {state?.error && <p role="alert" className="text-sm text-alerte basis-full">{state.error}</p>}
    </form>
  );
}

export function CreerLigue() {
  const [state, action, pending] = useActionState(creerLigue, undefined);
  return (
    <form action={action} className="grid gap-2">
      <input name="nom" required maxLength={50} placeholder="Les piliers du jeudi" aria-label="Nom de la ligue" className="champ" />
      <button className="bouton-or justify-center" disabled={pending}>{pending ? "Création…" : "Créer la ligue"}</button>
      {state?.error && <p role="alert" className="text-sm text-alerte">{state.error}</p>}
    </form>
  );
}

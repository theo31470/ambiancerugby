"use client";
import { useActionState } from "react";
import { definirMotDePasse, demanderReinitialisation } from "@/app/actions";

export function DemandeReinitialisation() {
  const [state, action, pending] = useActionState(demanderReinitialisation, undefined);
  if (state?.ok) return <p role="status" className="bg-teinte rounded-lg p-4">{state.ok}</p>;
  return (
    <form action={action} className="grid gap-4">
      <div>
        <label htmlFor="email" className="etiquette">E-mail du compte</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="champ" />
      </div>
      {state?.error && <p role="alert" className="text-sm text-alerte">{state.error}</p>}
      <button className="bouton" disabled={pending}>{pending ? "Un instant…" : "Recevoir le lien"}</button>
    </form>
  );
}

export function NouveauMotDePasse() {
  const [state, action, pending] = useActionState(definirMotDePasse, undefined);
  return (
    <form action={action} className="grid gap-4">
      <div>
        <label htmlFor="nouveau" className="etiquette">Nouveau mot de passe</label>
        <input id="nouveau" name="nouveau" type="password" autoComplete="new-password" minLength={8} required className="champ" />
        <p className="text-xs text-sourdine mt-1">8 caractères minimum.</p>
      </div>
      <div>
        <label htmlFor="confirmation" className="etiquette">Confirmation</label>
        <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required className="champ" />
      </div>
      {state?.error && <p role="alert" className="text-sm text-alerte">{state.error}</p>}
      <button className="bouton" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le mot de passe"}</button>
    </form>
  );
}

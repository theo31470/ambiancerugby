"use client";
import { useActionState } from "react";
import { connexionStudio } from "@/app/studio/(acces)/actions";

export default function FormConnexion({ suite }: { suite: string }) {
  const [s, action, envoi] = useActionState(connexionStudio, undefined);
  return (
    <form action={action} className="mt-5 grid gap-4">
      <input type="hidden" name="suite" value={suite} />
      <label className="grid gap-1 text-sm font-semibold">E-mail<input type="email" name="email" required autoComplete="username" className="champ" /></label>
      <label className="grid gap-1 text-sm font-semibold">Mot de passe<input type="password" name="password" required autoComplete="current-password" className="champ" /></label>
      {s?.error && <p role="alert" className="text-sm text-alerte">{s.error}</p>}
      <button className="bouton justify-center" disabled={envoi}>{envoi ? "Connexion…" : "Continuer"}</button>
    </form>
  );
}

"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/app/actions";

export default function AuthForm({ mode, suite }: { mode: "signin" | "signup"; suite?: string }) {
  const [state, action, pending] = useActionState(mode === "signin" ? signIn : signUp, undefined);
  if (state?.ok) {
    return <p role="status" className="bg-teinte rounded-lg p-4">{state.ok}</p>;
  }
  return (
    <form action={action} className="grid gap-4">
      {suite && <input type="hidden" name="suite" value={suite} />}
      {mode === "signup" && (
        <div>
          <label htmlFor="display_name" className="etiquette">Nom affiché</label>
          <input id="display_name" name="display_name" autoComplete="nickname" maxLength={40} className="champ" placeholder="Comme en tribune" />
        </div>
      )}
      <div>
        <label htmlFor="email" className="etiquette">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="champ" />
      </div>
      <div>
        <label htmlFor="password" className="etiquette">Mot de passe</label>
        <input id="password" name="password" type="password" required minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"} className="champ" />
        {mode === "signup" && <p className="text-xs text-sourdine mt-1">8 caractères minimum.</p>}
        {mode === "signin" && <Link href="/mot-de-passe-oublie" className="inline-block text-xs text-vin underline underline-offset-4 mt-1.5">Mot de passe oublié ?</Link>}
      </div>
      {state?.error && <p role="alert" className="text-sm text-alerte">{state.error}</p>}
      <button className="bouton" disabled={pending}>
        {pending ? "Un instant…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
      </button>
    </form>
  );
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Suivre ma commande" };

async function chercher(form: FormData) {
  "use server";
  const numero = String(form.get("numero") ?? "").trim().toUpperCase();
  const email = String(form.get("email") ?? "").trim();
  redirect(`/suivi/${encodeURIComponent(numero)}?e=${encodeURIComponent(email)}`);
}

export default async function Suivi({ searchParams }: PageProps<"/suivi">) {
  const sp = await searchParams;
  return (
    <div className="max-w-md">
      <h1 className="groovy text-5xl text-vin">Suivre ma commande</h1>
      <p className="mt-3 text-sourdine">Le numéro (AR-…) figure dans l&apos;e-mail de confirmation.</p>
      {sp.introuvable && <p role="alert" className="mt-4 rounded-lg bg-alerte/10 text-alerte px-3 py-2 text-sm">Aucune commande ne correspond à ce numéro et cet e-mail.</p>}
      <form action={chercher} className="mt-6 grid gap-4">
        <label className="grid gap-1 font-semibold text-sm">Numéro de commande<input name="numero" required placeholder="AR-1001" className="champ font-normal" /></label>
        <label className="grid gap-1 font-semibold text-sm">E-mail utilisé pour la commande<input name="email" type="email" required className="champ font-normal" /></label>
        <button className="bouton-or justify-center">Voir le suivi</button>
      </form>
    </div>
  );
}

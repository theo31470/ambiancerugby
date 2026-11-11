import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { Field, Area } from "@/components/admin/Field";
import { connecterPrintful, ouvrirBoutique, saveReglagesBoutique } from "../actions";

export default async function ReglagesBoutique({ searchParams }: PageProps<"/studio/boutique/reglages">) {
  const sp = await searchParams;
  const db = await createClient();
  const { data: r } = await db.from("shop_settings").select("*").eq("id", 1).single();
  const sk = process.env.STRIPE_SECRET_KEY ?? "";
  const cles: [string, boolean, string][] = [
    ["Printful", !!process.env.PRINTFUL_API_KEY, "PRINTFUL_API_KEY"],
    ["Stripe (clé secrète)", !!sk, "STRIPE_SECRET_KEY"],
    ["Stripe (clé publique)", !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
    ["Stripe (webhook)", !!process.env.STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET"],
    ["Supabase (clé serveur)", !!process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"],
  ];
  return (
    <div>
      <Link href="/studio/boutique" className="text-sm text-sourdine underline underline-offset-4">Commandes</Link>
      <div className="mt-2"><PageHeader titre="Réglages de la boutique" description="Branchements Printful et Stripe, et les informations imprimées sur les factures." /></div>
      <Notice sp={sp} />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="bg-surface border border-trait rounded-2xl p-5">
          <h2 className="font-bold text-lg">Branchements</h2>
          <p className="mt-1 text-sm">{sk ? (sk.startsWith("sk_test") ? <span className="font-semibold text-vin">Clés de test Stripe : fausses cartes, commandes Printful en brouillon.</span> : <span className="font-semibold text-ok">Clés de production Stripe : les paiements sont réellement encaissés.</span>) : "Stripe n'est pas encore branché."}</p>
          <ul className="mt-4 grid gap-2 text-sm">
            {cles.map(([n, ok, k]) => (
              <li key={k} className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${ok ? "bg-ok" : "bg-alerte"}`} aria-hidden />
                <span className="flex-1">{n}</span>
                <code className="text-xs text-sourdine">{k}</code>
                <span className="text-xs font-semibold">{ok ? "OK" : "manquante"}</span>
              </li>
            ))}
          </ul>
          <form action={connecterPrintful} className="mt-5">
            <input type="hidden" name="_back" value="/studio/boutique/reglages" />
            <button className="bouton-discret" disabled={!process.env.PRINTFUL_API_KEY}>Brancher le suivi Printful (expéditions)</button>
            <p className="text-xs text-sourdine mt-1">À faire une fois : Printful préviendra le site à chaque expédition.</p>
          </form>
        </section>
        <section className={`rounded-2xl p-5 xl:col-span-2 ${r?.mode_test === false ? "bg-ok/10 border-2 border-ok" : "bg-moutarde/15 border-2 border-moutarde"}`}>
          <h2 className="font-bold text-lg">{r?.mode_test === false ? "La boutique est ouverte" : "La boutique est fermée au public"}</h2>
          <p className="mt-1 text-sm max-w-2xl">
            {r?.mode_test === false
              ? "Tout le monde peut commander. Chaque commande payée part en fabrication chez Printful."
              : "Seule la rédaction peut passer une commande d'essai. Elle reste en brouillon chez Printful : rien n'est fabriqué ni facturé par Printful. Avec des clés Stripe de production, le paiement d'essai est réel : remboursez-le ensuite depuis la commande."}
          </p>
          <form action={ouvrirBoutique} className="mt-3 flex flex-wrap items-center gap-3">
            <input type="hidden" name="_back" value="/studio/boutique/reglages" />
            <input type="hidden" name="ouvrir" value={r?.mode_test === false ? "0" : "1"} />
            {r?.mode_test !== false && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirme" /> J&apos;ai fait une commande d&apos;essai et tout fonctionne</label>}
            <button className={r?.mode_test === false ? "bouton-discret" : "bouton"}>{r?.mode_test === false ? "Fermer la boutique" : "Ouvrir la boutique"}</button>
          </form>
        </section>
        <form action={saveReglagesBoutique} className="bg-surface border border-trait rounded-2xl p-5 grid gap-4">
          <input type="hidden" name="_back" value="/studio/boutique/reglages" />
          <h2 className="font-bold text-lg">Factures</h2>
          <Field name="vendeur_nom" label="Nom ou nom commercial" defaultValue={r?.vendeur_nom} />
          <Area name="vendeur_adresse" label="Adresse" rows={3} defaultValue={r?.vendeur_adresse} />
          <Field name="vendeur_siret" label="SIRET" defaultValue={r?.vendeur_siret} />
          <Field name="vendeur_email" label="E-mail de contact" type="email" defaultValue={r?.vendeur_email} />
          <Field name="mention_tva" label="Mention TVA" defaultValue={r?.mention_tva} hint="Micro-entreprise : « TVA non applicable, art. 293 B du CGI »." />
          <div><button className="bouton">Enregistrer</button></div>
        </form>
      </div>
    </div>
  );
}

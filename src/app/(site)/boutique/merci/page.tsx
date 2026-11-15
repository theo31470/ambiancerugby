import Link from "next/link";
import type { Metadata } from "next";
import { after } from "next/server";
import { stripe } from "@/lib/shop/stripe";
import { shopDb, type Commande } from "@/lib/shop/admin";
import { commandePayee } from "@/lib/shop/traitement";
import ViderPanier from "@/components/shop/ViderPanier";
import EtapesCommande from "@/components/shop/EtapesCommande";
import { Ballon, Poteaux } from "@/components/deco/Icones";

export const metadata: Metadata = { title: "Merci !", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Merci({ searchParams }: PageProps<"/boutique/merci">) {
  const sp = await searchParams;
  // paiement intégré (PaymentIntent) ; anciennes commandes payées sur la page Stripe (session)
  const piId = typeof sp.payment_intent === "string" ? sp.payment_intent : null;
  const id = typeof sp.session_id === "string" ? sp.session_id : null;
  const pi = piId ? await stripe().paymentIntents.retrieve(piId).catch(() => null) : null;
  const session = !pi && id ? await stripe().checkout.sessions.retrieve(id).catch(() => null) : null;
  const paye = pi ? pi.status === "succeeded" : session?.payment_status === "paid";
  const enCours = pi?.status === "processing";
  const numero = pi?.metadata?.numero ?? session?.metadata?.numero;
  // filet de sécurité si le webhook tarde : la commande payée part tout de suite à l'atelier (une seule fois, voir commandePayee)
  if (pi?.status === "succeeded" && pi.metadata?.source === "boutique" && pi.metadata.order_id) {
    const { data } = await shopDb().rpc("shop_lire_commande", { p_secret: null, p_id: pi.metadata.order_id });
    const c = (data as Commande[] | null)?.[0];
    if (c?.statut === "en_attente" && pi.amount_received === c.total_cents) after(() => commandePayee(c, pi.id));
  }
  const email = pi?.receipt_email ?? session?.customer_details?.email ?? session?.customer_email ?? "";
  return (
    <div className="max-w-2xl mx-auto text-center py-6">
      {paye && <div className="flex justify-center"><EtapesCommande actuelle={3} /></div>}
      {paye && <ViderPanier />}
      <div className="relative h-40 mx-auto w-64" aria-hidden>
        <Poteaux className="absolute left-1/2 -translate-x-1/2 bottom-0 h-40 w-auto text-vin" />
        <Ballon className="absolute left-1/2 -translate-x-1/2 bottom-24 w-14 text-moutarde animate-[rebond_1.2s_ease-in-out_infinite]" />
      </div>
      {paye ? (
        <>
          <h1 className="groovy text-5xl sm:text-6xl text-vin mt-6">Transformé !</h1>
          <p className="mt-4 text-lg">Merci, votre commande <strong>{numero}</strong> est payée. Un reçu part à <strong>{email}</strong>.</p>
          <p className="mt-2 text-sourdine">Elle part en fabrication : suivez chaque étape jusqu&apos;à votre boîte aux lettres.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/suivi/${numero}?e=${encodeURIComponent(email)}`} className="bouton-or">Suivre ma commande</Link>
            <Link href={`/boutique/facture/${numero}?e=${encodeURIComponent(email)}`} className="bouton-discret">Ma facture</Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="groovy text-5xl text-vin mt-6">Paiement en cours</h1>
          <p className="mt-4 text-sourdine">{enCours ? "Votre banque est en train de valider le paiement. La confirmation arrive par e-mail dans quelques minutes." : "Le paiement n'a pas été confirmé. Si vous avez été débité, la confirmation arrive dans quelques minutes par e-mail ; sinon, vous pouvez réessayer depuis le panier."}</p>
          <Link href="/boutique/panier" className="bouton-discret mt-6">Revenir au panier</Link>
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { stripe } from "@/lib/shop/stripe";
import ViderPanier from "@/components/shop/ViderPanier";
import { Ballon, Poteaux } from "@/components/deco/Icones";

export const metadata: Metadata = { title: "Merci !", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Merci({ searchParams }: PageProps<"/boutique/merci">) {
  const sp = await searchParams;
  const id = typeof sp.session_id === "string" ? sp.session_id : null;
  const session = id ? await stripe().checkout.sessions.retrieve(id).catch(() => null) : null;
  const paye = session?.payment_status === "paid";
  const numero = session?.metadata?.numero;
  const email = session?.customer_details?.email ?? session?.customer_email ?? "";
  return (
    <div className="max-w-2xl mx-auto text-center py-6">
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
          <p className="mt-4 text-sourdine">Le paiement n&apos;est pas encore confirmé. Si vous avez été débité, la confirmation arrive dans quelques minutes par e-mail.</p>
          <Link href="/boutique/panier" className="bouton-discret mt-6">Revenir au panier</Link>
        </>
      )}
    </div>
  );
}

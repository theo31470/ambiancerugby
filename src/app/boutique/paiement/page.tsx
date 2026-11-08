import type { Metadata } from "next";
import Paiement from "@/components/shop/Paiement";
import { getViewer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Paiement", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PaiementPage() {
  const viewer = await getViewer();
  return (
    <div>
      <h1 className="groovy text-5xl text-vin mb-8">Commande</h1>
      <Paiement email={viewer?.email ?? null} />
    </div>
  );
}

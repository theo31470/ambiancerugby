import type { Metadata } from "next";
import Panier from "@/components/shop/Panier";
import EtapesCommande from "@/components/shop/EtapesCommande";
import { seuilLivraisonOfferte } from "@/lib/shop/catalogue";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PanierPage() {
  const seuil = await seuilLivraisonOfferte().catch(() => null);
  return (
    <div>
      <EtapesCommande actuelle={0} />
      <h1 className="groovy text-5xl text-vin mb-8">Panier</h1>
      <Panier seuil={seuil} />
    </div>
  );
}

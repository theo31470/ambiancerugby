import type { Metadata } from "next";
import Panier from "@/components/shop/Panier";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };

export default function PanierPage() {
  return (
    <div>
      <h1 className="groovy text-5xl text-vin mb-8">Panier</h1>
      <Panier />
    </div>
  );
}

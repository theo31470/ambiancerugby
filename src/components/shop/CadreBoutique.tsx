import NavBoutique from "./NavBoutique";
import TiroirPanier from "./TiroirPanier";
import { seuilLivraisonOfferte } from "@/lib/shop/catalogue";

/** Cadre commun aux pages de la boutique et du suivi : barre de navigation et panier en tiroir. */
export default async function CadreBoutique({ children }: { children: React.ReactNode }) {
  const seuil = await seuilLivraisonOfferte().catch(() => null);
  return (
    <>
      <NavBoutique />
      {children}
      <TiroirPanier seuil={seuil} />
    </>
  );
}

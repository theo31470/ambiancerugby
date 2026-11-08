"use client";
import { useEffect } from "react";
import { panier } from "@/lib/shop/panier";

/** Vide le panier une fois la commande payée, et fait lever la tribune. */
export default function ViderPanier() {
  useEffect(() => { panier.vider(); window.dispatchEvent(new Event("ar:essai")); }, []);
  return null;
}

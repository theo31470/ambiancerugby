import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { STATUTS, type Commande } from "@/lib/shop/admin";
import { euros } from "@/lib/shop/format";

export const metadata: Metadata = { title: "Mes commandes" };
export const dynamic = "force-dynamic";

export default async function MesCommandes() {
  const db = await createClient();
  const { data } = await db.from("shop_orders").select("id,numero,statut,total_cents,created_at,facture_numero,items").neq("statut", "en_attente").order("created_at", { ascending: false });
  const commandes = (data ?? []) as Pick<Commande, "id" | "numero" | "statut" | "total_cents" | "created_at" | "facture_numero" | "items">[];
  if (!commandes.length) return (
    <div>
      <p className="text-sourdine">Pas encore de commande.</p>
      <Link href="/boutique" className="bouton-or mt-4">Découvrir la boutique</Link>
    </div>
  );
  return (
    <ul className="grid gap-3">
      {commandes.map((c) => (
        <li key={c.id} className="bg-surface border border-trait rounded-2xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{c.numero} <span className="ml-2 text-xs font-bold rounded-full bg-teinte px-2 py-0.5">{STATUTS[c.statut]}</span></p>
            <p className="text-sm text-sourdine">{new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}, {c.items.reduce((s, i) => s + i.quantite, 0)} article(s), {euros(c.total_cents)}</p>
          </div>
          <Link href={`/suivi/${c.numero}`} className="bouton-discret">Suivi</Link>
          {c.facture_numero && <Link href={`/boutique/facture/${c.numero}`} className="bouton-discret">Facture</Link>}
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { Field } from "@/components/admin/Field";
import { euros } from "@/lib/shop/format";
import { basculerCode, saveCode } from "../actions";

type Code = { id: string; code: string; type: string; valeur: number; minimum_cents: number; debut: string | null; fin: string | null; max_utilisations: number | null; utilisations: number; actif: boolean; note: string | null };

const libelle = (c: Code) => (c.type === "pourcentage" ? `-${c.valeur} %` : c.type === "montant" ? `-${euros(c.valeur)}` : "Livraison offerte");
const jour = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" }) : null);

export default async function CodesPromo({ searchParams }: PageProps<"/studio/boutique/codes">) {
  const sp = await searchParams;
  const db = await createClient();
  const { data } = await db.from("shop_codes").select("*").order("created_at", { ascending: false });
  const codes = (data ?? []) as Code[];
  const back = "/studio/boutique/codes";
  return (
    <div>
      <Link href="/studio/boutique/reglages" className="text-sm text-sourdine underline underline-offset-4">Réglages de la boutique</Link>
      <div className="mt-2"><PageHeader titre="Codes promo" description="Le client saisit le code au moment de payer. La remise apparaît sur sa facture." /></div>
      <Notice sp={sp} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-sourdine border-b border-trait text-left">
              <th scope="col" className="font-semibold px-4 py-2.5">Code</th><th scope="col" className="font-semibold px-3">Remise</th>
              <th scope="col" className="font-semibold px-3">Conditions</th><th scope="col" className="font-semibold px-3 text-right">Utilisé</th><th scope="col" className="px-3" />
            </tr></thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className={`border-b border-trait last:border-0 ${c.actif ? "" : "text-sourdine"}`}>
                  <th scope="row" className="text-left px-4 py-2.5 font-mono font-semibold">{c.code}{c.note && <span className="block font-sans font-normal text-xs text-sourdine">{c.note}</span>}</th>
                  <td className="px-3 font-semibold">{libelle(c)}</td>
                  <td className="px-3 text-xs">{[c.minimum_cents ? `dès ${euros(c.minimum_cents)}` : null, c.debut ? `du ${jour(c.debut)}` : null, c.fin ? `jusqu'au ${jour(c.fin)}` : null].filter(Boolean).join(", ") || "aucune"}</td>
                  <td className="px-3 text-right tnum">{c.utilisations}{c.max_utilisations != null ? ` / ${c.max_utilisations}` : ""}</td>
                  <td className="px-3">
                    <form action={basculerCode}>
                      <input type="hidden" name="_back" value={back} /><input type="hidden" name="id" value={c.id} /><input type="hidden" name="actif" value={c.actif ? "0" : "1"} />
                      <button className="text-xs font-semibold underline underline-offset-2">{c.actif ? "Désactiver" : "Réactiver"}</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!codes.length && <tr><td colSpan={5} className="px-4 py-8 text-sourdine">Aucun code pour l&apos;instant.</td></tr>}
            </tbody>
          </table>
        </div>
        <form action={saveCode} className="bg-surface border border-trait rounded-2xl p-5 grid gap-4 h-fit">
          <input type="hidden" name="_back" value={back} />
          <h2 className="font-bold text-lg">Nouveau code</h2>
          <Field name="code" label="Code" required placeholder="BIENVENUE10" hint="Lettres, chiffres et tiret. Un code existant est mis à jour." />
          <div>
            <label htmlFor="type" className="etiquette">Type de remise</label>
            <select id="type" name="type" className="champ" defaultValue="pourcentage">
              <option value="pourcentage">Pourcentage du panier</option>
              <option value="montant">Montant fixe</option>
              <option value="livraison">Livraison offerte</option>
            </select>
          </div>
          <Field name="valeur" label="Valeur (% ou €)" type="number" step="0.01" hint="10 pour 10 %, ou 5 pour 5 €. Ignoré pour la livraison offerte." />
          <Field name="minimum" label="Panier minimum (€)" type="number" step="0.01" />
          <div className="grid grid-cols-2 gap-3">
            <Field name="debut" label="Début" type="date" />
            <Field name="fin" label="Fin (incluse)" type="date" />
          </div>
          <Field name="max_utilisations" label="Nombre d'utilisations maximum" type="number" hint="Vide : illimité." />
          <Field name="note" label="Note interne" placeholder="Newsletter de novembre" />
          <div><button className="bouton">Enregistrer le code</button></div>
        </form>
      </div>
    </div>
  );
}

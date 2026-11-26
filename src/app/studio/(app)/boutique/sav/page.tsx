import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { shopDb } from "@/lib/shop/admin";
import { MOTIFS_SAV, STATUTS_SAV, SOUHAITS, type MotifSav } from "@/lib/shop/sav";
import { fmtRelative } from "@/lib/format";

const FILTRES: [string, string][] = [["ouvertes", "À traiter"], ["terminees", "Traitées"], ["toutes", "Toutes"]];

export default async function SavPage({ searchParams }: PageProps<"/studio/boutique/sav">) {
  const sp = await searchParams;
  const vue = typeof sp.vue === "string" && FILTRES.some(([v]) => v === sp.vue) ? sp.vue : "ouvertes";
  let req = shopDb().from("shop_sav").select("id,numero,order_id,email,motif,souhait,statut,message,created_at,order:shop_orders(numero)").order("created_at", { ascending: vue === "ouvertes" }).limit(200);
  if (vue === "ouvertes") req = req.in("statut", ["ouverte", "en_cours"]);
  if (vue === "terminees") req = req.in("statut", ["acceptee", "refusee", "cloturee"]);
  const { data } = await req;
  const demandes = (data ?? []) as unknown as { id: string; numero: string; order_id: string; email: string; motif: string; souhait: string | null; statut: string; message: string; created_at: string; order: { numero: string } | null }[];
  return (
    <div>
      <PageHeader titre="Service après-vente" description="Retours, produits abîmés, colis perdus : chaque demande client arrive ici. Ouvrez-la pour répondre et prévenir le client par e-mail."
        actions={<Link href="/studio/boutique" className="bouton-discret">Commandes</Link>} />
      <nav aria-label="Filtrer" className="flex flex-wrap gap-1 mb-4">
        {FILTRES.map(([v, l]) => (
          <Link key={v} href={`/studio/boutique/sav?vue=${v}`} aria-current={vue === v ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${vue === v ? "bg-vin text-white" : "bg-surface border border-trait hover:border-vin"}`}>{l}</Link>
        ))}
      </nav>
      {demandes.length ? (
        <ul className="grid gap-3">
          {demandes.map((d) => (
            <li key={d.id}>
              <Link href={`/studio/boutique/commandes/${d.order_id}#sav`} className={`block bg-surface border-2 rounded-2xl p-4 hover:border-vin ${["ouverte", "en_cours"].includes(d.statut) ? "border-moutarde" : "border-trait"}`}>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-bold">{d.numero}</span>
                  <span className="text-sm">{MOTIFS_SAV[d.motif as MotifSav]?.titre ?? d.motif}{d.souhait ? `, souhaite : ${(SOUHAITS[d.souhait] ?? d.souhait).toLowerCase()}` : ""}</span>
                  <span className="ml-auto text-xs font-bold rounded-full bg-teinte px-2.5 py-1">{STATUTS_SAV[d.statut] ?? d.statut}</span>
                </p>
                <p className="text-xs text-sourdine mt-1">Commande {d.order?.numero} · {d.email} · {fmtRelative(d.created_at)}</p>
                <p className="mt-2 text-sm line-clamp-2">{d.message}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="bg-surface border border-trait rounded-2xl p-6 text-sourdine">{vue === "ouvertes" ? "Aucune demande en attente. Rien à traiter." : "Aucune demande."}</p>}
    </div>
  );
}

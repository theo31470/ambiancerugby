import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/supabase/server";
import { shopDb, type Commande } from "@/lib/shop/admin";
import { lireCommandeVisiteur } from "@/lib/shop/lecture";
import { docAvoir, docCommande, docSupporter, pdfDe, type AvoirRow, type FactureSupporterRow } from "@/lib/factures/donnees";
import type { DocumentFacture } from "@/lib/factures/types";

export const dynamic = "force-dynamic";

const introuvable = () => NextResponse.json({ erreur: "Document introuvable" }, { status: 404 });

/**
 * Facture ou avoir en PDF. Accessible à son titulaire (connecté), à un invité de la boutique
 * avec l'e-mail de sa commande (?e=), ou à la rédaction. Même réponse qu'un document inexistant sinon.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/factures/[numero]">) {
  const numero = decodeURIComponent((await ctx.params).numero).replace(/\.pdf$/i, "").toUpperCase();
  if (!/^[FA]-\d{4}-\d{3,}$/.test(numero)) return introuvable();
  const e = request.nextUrl.searchParams.get("e");
  const db = shopDb();
  const viewer = await getViewer();
  const staff = !!viewer && ["admin", "editor"].includes(viewer.role);

  // accès à une commande boutique : titulaire, invité avec son e-mail, ou rédaction
  const accesCommande = async (orderNumero: string) => staff || !!(await lireCommandeVisiteur(orderNumero, e));

  let doc: DocumentFacture | null = null;
  if (numero.startsWith("A-")) {
    const { data: a } = await db.from("avoirs").select("*").eq("numero", numero).maybeSingle<AvoirRow>();
    if (!a) return introuvable();
    let ok = staff || (!!viewer && a.user_id === viewer.id);
    if (!ok && a.order_id) {
      const { data: o } = await db.from("shop_orders").select("numero").eq("id", a.order_id).maybeSingle();
      ok = !!o && (await accesCommande(o.numero));
    }
    if (!ok) return introuvable();
    doc = docAvoir(a);
  } else {
    const { data: f } = await db.from("supporter_factures").select("*").eq("numero", numero).maybeSingle<FactureSupporterRow>();
    if (f) {
      if (!staff && f.user_id !== viewer?.id) return introuvable();
      doc = docSupporter(f);
    } else {
      const { data: c } = await db.from("shop_orders").select("*").eq("facture_numero", numero).maybeSingle<Commande & { moyen?: string | null }>();
      if (!c || !(await accesCommande(c.numero))) return introuvable();
      doc = docCommande(c);
    }
  }

  if (!doc) return introuvable();
  const pdf = await pdfDe(doc);
  const nom = `Ambiance-Rugby-${doc.type}-${doc.numero}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${request.nextUrl.searchParams.has("telecharger") ? "attachment" : "inline"}; filename="${nom}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

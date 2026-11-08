import { synchroniserPrintful } from "@/lib/shop/traitement";

/** Événements Printful (expédition, échec, annulation). On relit toujours la commande chez Printful avant d'agir. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const id = Number(body?.data?.order?.id ?? body?.data?.id);
  if (!Number.isFinite(id) || id <= 0) return Response.json({ ignore: true });
  try {
    const statut = await synchroniserPrintful(id);
    return Response.json({ ok: true, statut });
  } catch (e) {
    return new Response((e as Error).message, { status: 500 });
  }
}

import { redirect } from "next/navigation";

/** Ancienne adresse des factures Supporter : elles sont désormais en PDF. */
export default async function FactureSupporter({ params }: PageProps<"/compte/factures/[numero]">) {
  const { numero } = await params;
  redirect(`/factures/${encodeURIComponent(decodeURIComponent(numero))}`);
}

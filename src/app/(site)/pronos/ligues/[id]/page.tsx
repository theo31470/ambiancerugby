import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getViewer } from "@/lib/supabase/server";
import TableauClassement from "@/components/pronos/TableauClassement";
import { quitterLigue } from "../../actions";
import CopierCode from "@/components/pronos/CopierCode";

export const metadata: Metadata = { title: "Ligue de pronos", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LiguePage({ params }: PageProps<"/pronos/ligues/[id]">) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/connexion?suite=/pronos/ligues/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: l } = await (await createClient()).from("prono_ligues").select("id,nom,code,owner_id").eq("id", id).maybeSingle();
  if (!l) notFound();
  return (
    <div>
      <Link href="/pronos?vue=ligues" className="text-sm text-sourdine hover:text-vin">← Mes ligues</Link>
      <h1 className="groovy text-5xl text-vin mt-2">{l.nom}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-sourdine">Code d&apos;invitation :</p>
        <CopierCode code={l.code} />
      </div>
      <h2 className="titre text-2xl font-extrabold mt-8 mb-3">Classement de la saison</h2>
      <TableauClassement ligue={l.id} />
      <form action={quitterLigue} className="mt-8">
        <input type="hidden" name="id" value={l.id} />
        <button className="text-sm text-sourdine underline underline-offset-4 hover:text-alerte">Quitter cette ligue</button>
      </form>
    </div>
  );
}

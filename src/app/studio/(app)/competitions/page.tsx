/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { fmtRelative } from "@/lib/format";

const TYPES: Record<string, string> = { league: "Championnat", cup: "Coupe", international: "International" };

export default async function AdminCompetitions({ searchParams }: PageProps<"/studio/competitions">) {
  const sp = await searchParams;
  const db = await createClient();
  const { data } = await db.from("competitions").select("id,slug,name,short_name,kind,color,text_color,logo_url,active,is_featured,sort_order,current_season,last_synced_at,niveau").order("sort_order");
  return (
    <div>
      <PageHeader titre="Compétitions" description="Nom, logo, couleurs, ordre d'affichage et niveau pour l'Indice. Une compétition désactivée disparaît du site et n'est plus synchronisée." />
      <Notice sp={sp} />
      <div className="bg-surface border border-trait rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-sourdine border-b border-trait text-left">
            <th scope="col" className="font-semibold px-4 py-2.5">Compétition</th>
            <th scope="col" className="font-semibold px-3">Type</th>
            <th scope="col" className="font-semibold px-3">Saison</th>
            <th scope="col" className="font-semibold px-3">Niveau</th>
            <th scope="col" className="font-semibold px-3">Mise à jour</th>
            <th scope="col" className="font-semibold px-3">État</th>
          </tr></thead>
          <tbody>
            {(data ?? []).map((c) => (
              <tr key={c.id} className={`border-b border-trait last:border-0 hover:bg-teinte/60 ${c.active ? "" : "opacity-60"}`}>
                <th scope="row" className="text-left font-normal px-4 py-2">
                  <Link href={`/studio/competitions/${c.id}`} className="flex items-center gap-3 group">
                    <span className="w-9 h-9 rounded-lg grid place-items-center p-1 shrink-0" style={{ background: c.color ?? "var(--vin)" }}>
                      {c.logo_url ? <img src={c.logo_url} alt="" className="max-w-full max-h-full object-contain bg-white rounded" /> : null}
                    </span>
                    <span className="font-semibold group-hover:underline underline-offset-4">{c.name}</span>
                  </Link>
                </th>
                <td className="px-3 text-sourdine">{TYPES[c.kind]}</td>
                <td className="px-3 tnum">{c.current_season}</td>
                <td className="px-3 tnum">{c.niveau}</td>
                <td className="px-3 text-sourdine">{c.last_synced_at ? fmtRelative(c.last_synced_at) : "–"}</td>
                <td className="px-3">{c.active ? <span className="text-xs font-bold rounded-full bg-ok/15 text-ok px-2 py-0.5">Active</span> : <span className="text-xs font-bold rounded-full bg-teinte text-sourdine px-2 py-0.5">Désactivée</span>}{c.is_featured && <span className="ml-1 text-xs font-bold rounded-full bg-moutarde text-bordeaux px-2 py-0.5">À la une</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { createClient, publicClient } from "@/lib/supabase/server";

export const debutSaison = () => { const d = new Date(); return new Date(d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1, 6, 1).toISOString(); };

export default async function TableauClassement({ ligue }: { ligue?: string }) {
  const db = ligue ? await createClient() : publicClient();
  const { data } = await db.rpc("pronos_classement", { p_ligue: ligue ?? null, p_depuis: debutSaison(), p_limite: 100 });
  const rows = (data ?? []) as { user_id: string; pseudo: string | null; nom: string | null; avatar_url: string | null; points: number; joues: number; exacts: number }[];
  if (!rows.length) return <Vide>Le classement s&apos;affichera après les premiers matchs pronostiqués.</Vide>;
  return (
    <ol className="bg-surface border border-trait rounded-2xl divide-y divide-trait">
      {rows.map((r, i) => (
        <li key={r.user_id} className="flex items-center gap-3 px-4 py-2.5">
          <span className={`w-8 text-center titre font-extrabold tnum ${i < 3 ? "text-vin text-lg" : "text-sourdine"}`}>{i + 1}</span>
          <span className="flex-1 min-w-0 truncate font-semibold">{r.pseudo ? <Link href={`/membres/${r.pseudo}`} className="hover:text-vin">{r.nom ?? r.pseudo}</Link> : r.nom ?? "Supporter"}</span>
          <span className="text-xs text-sourdine tnum hidden sm:block">{r.joues} matchs · {r.exacts} coups parfaits</span>
          <span className="w-16 text-right titre font-extrabold tnum">{r.points} pts</span>
        </li>
      ))}
    </ol>
  );
}


function Vide({ children }: { children: React.ReactNode }) {
  return <p className="bg-surface border border-trait rounded-2xl p-5 text-sourdine">{children}</p>;
}

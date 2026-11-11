"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { chercherJoueurs, type Trouve } from "@/app/(site)/joueurs/comparer/actions";

/** Champ de recherche d'un joueur ; le choix met à jour l'adresse (?a= / ?b=). */
export default function ChoixJoueur({ cle, label, actuel }: { cle: "a" | "b"; label: string; actuel: string | null }) {
  const [q, setQ] = useState(actuel ?? "");
  const [res, setRes] = useState<Trouve[]>([]);
  const [, start] = useTransition();
  const router = useRouter();
  const sp = useSearchParams();
  useEffect(() => {
    const t = setTimeout(() => start(async () => setRes(q && q !== actuel ? await chercherJoueurs(q) : [])), 250);
    return () => clearTimeout(t);
  }, [q, actuel]);
  return (
    <div className="relative">
      <label className="etiquette" htmlFor={`j-${cle}`}>{label}</label>
      <input id={`j-${cle}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom d'un joueur" autoComplete="off" className="champ" />
      {res.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-surface border border-trait rounded-xl shadow-lg overflow-hidden">
          {res.map((r) => (
            <li key={r.slug}>
              <button type="button" className="w-full text-left px-3 py-2 hover:bg-teinte flex justify-between gap-2"
                onClick={() => { const p = new URLSearchParams(sp.toString()); p.set(cle, r.slug); setRes([]); setQ(r.nom); router.push(`/joueurs/comparer?${p}`); }}>
                <span className="font-semibold truncate">{r.nom}</span><span className="text-sm text-sourdine shrink-0">{r.club}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

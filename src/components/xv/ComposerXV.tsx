"use client";
/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, useTransition } from "react";
import { enregistrerXV } from "@/app/(site)/pronos/xv-actions";
import { LIGNES_XV, POSTES_XV, type Candidat } from "@/lib/xv-commun";

/** Composer son XV : on touche un poste, on choisit un joueur qui y a joué cette semaine. */
export default function ComposerXV({ candidats, initial }: { candidats: Record<string, Candidat[]>; initial: Record<string, string> }) {
  const [xv, setXv] = useState<Record<string, string>>(initial);
  const [poste, setPoste] = useState<number | null>(null);
  const [filtre, setFiltre] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const tous = useMemo(() => {
    const m = new Map<string, Candidat>();
    for (const l of Object.values(candidats)) for (const c of l) if (!m.has(c.id)) m.set(c.id, c);
    return m;
  }, [candidats]);
  const total = Object.values(xv).reduce((s, id) => s + (tous.get(id)?.note ?? 0), 0);
  const choix = poste ? (candidats[poste] ?? []).filter((c) => !filtre || `${c.nom} ${c.club}`.toLowerCase().includes(filtre.toLowerCase())) : [];
  const placer = (n: number, id: string) => setXv((x) => {
    const y = Object.fromEntries(Object.entries(x).filter(([, v]) => v !== id));
    y[n] = id; return y;
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="terrain-xv rounded-3xl p-3 sm:p-5 text-white">
        <div className="grid gap-3">
          {LIGNES_XV.map((ligne, i) => (
            <div key={i} className="flex justify-center gap-2 sm:gap-4">
              {ligne.map((n) => {
                const c = xv[n] ? tous.get(xv[n]) : undefined;
                return (
                  <button key={n} type="button" onClick={() => { setPoste(n); setFiltre(""); }} aria-pressed={poste === n} aria-label={`${POSTES_XV[n]}${c ? ` : ${c.nom}` : ", à choisir"}`}
                    className={`w-[72px] sm:w-20 text-center rounded-xl p-1 ${poste === n ? "bg-white/20 ring-2 ring-moutarde" : "hover:bg-white/10"}`}>
                    {c?.photo ? <img src={c.photo} alt="" className="mx-auto w-11 h-11 rounded-full object-cover object-top bg-white/20 ring-2 ring-white/70" />
                      : <span className={`mx-auto grid place-items-center w-11 h-11 rounded-full titre font-extrabold ${c ? "bg-white/25 ring-2 ring-white/70" : "border-2 border-dashed border-white/60"}`}>{n}</span>}
                    <span className="mt-1 block text-[11px] font-bold leading-tight truncate">{c ? c.nom.split(" ").slice(-1)[0] : POSTES_XV[n]}</span>
                    {c?.note != null && <span className="block text-[10px] text-white/75">{c.note.toFixed(1)}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-sm font-bold">{Object.keys(xv).length}/15 · total <span className="text-moutarde tnum">{total.toFixed(1)}</span></p>
      </div>
      <div className="bg-surface border border-trait rounded-2xl p-4 content-start grid gap-3">
        {poste ? (
          <>
            <p className="font-bold">{poste} · {POSTES_XV[poste]}</p>
            <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Chercher un joueur ou un club" className="champ" />
            <ul className="max-h-80 overflow-y-auto divide-y divide-trait -mx-1">
              {choix.length ? choix.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => { placer(poste, c.id); setMsg(null); }} className={`w-full flex items-center gap-2 px-1 py-2 text-left hover:bg-teinte rounded-lg ${xv[poste] === c.id ? "bg-teinte" : ""}`}>
                    {c.photo ? <img src={c.photo} alt="" className="w-8 h-8 rounded-full object-cover object-top bg-teinte" /> : <span className="w-8 h-8 rounded-full bg-teinte" />}
                    <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{c.nom}</span><span className="block text-xs text-sourdine truncate">{c.club}</span></span>
                    <span className="titre font-extrabold tnum">{c.note?.toFixed(1) ?? "–"}</span>
                  </button>
                </li>
              )) : <li className="py-3 text-sm text-sourdine">Aucun joueur à ce poste cette semaine.</li>}
            </ul>
          </>
        ) : <p className="text-sourdine">Touchez un poste sur le terrain pour choisir votre joueur.</p>}
        <button type="button" className="bouton-or justify-center" disabled={pending || !Object.keys(xv).length}
          onClick={() => start(async () => setMsg(await enregistrerXV(xv)))}>{pending ? "Enregistrement…" : "Enregistrer mon XV"}</button>
        {msg && <p role="status" className={`text-sm font-semibold ${msg.error ? "text-alerte" : "text-ok"}`}>{msg.error ?? msg.ok}</p>}
      </div>
    </div>
  );
}

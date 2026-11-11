"use client";
import { useRef, useState, useTransition } from "react";
import { enregistrerProno } from "@/app/(site)/pronos/actions";

/** Saisie d'un pronostic : deux scores, enregistrés automatiquement dès qu'ils sont complets. */
export default function Pronostic({ matchId, initial, ferme, connecte, compact = false }: {
  matchId: string; initial: { h: number; a: number } | null; ferme: boolean; connecte: boolean; compact?: boolean;
}) {
  const [h, setH] = useState(initial?.h?.toString() ?? "");
  const [a, setA] = useState(initial?.a?.toString() ?? "");
  const [etat, setEtat] = useState<"" | "ok" | "err">("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sauver = (nh: string, na: string) => {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => {
      const vh = nh === "" ? null : Number(nh), va = na === "" ? null : Number(na);
      if ((vh === null) !== (va === null)) return; // attendre les deux scores
      start(async () => {
        const r = await enregistrerProno(matchId, vh, va);
        setEtat(r?.error ? "err" : "ok"); setMsg(r?.error ?? r?.ok ?? "");
      });
    }, 500);
  };

  if (!connecte) return <a href={`/connexion?suite=/pronos`} className="text-sm font-semibold text-vin underline underline-offset-4">Connectez-vous pour pronostiquer</a>;
  const champ = "w-12 h-11 rounded-xl border-2 border-trait bg-surface text-center titre text-lg font-extrabold tnum focus:border-vin disabled:opacity-60";
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      <input aria-label="Score de l'équipe qui reçoit" inputMode="numeric" maxLength={3} disabled={ferme} value={h} className={champ}
        onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setH(v); setEtat(""); sauver(v, a); }} />
      <span className="text-sourdine font-bold">–</span>
      <input aria-label="Score des visiteurs" inputMode="numeric" maxLength={3} disabled={ferme} value={a} className={champ}
        onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setA(v); setEtat(""); sauver(h, v); }} />
      <span aria-live="polite" className={`text-xs font-semibold min-w-[5rem] ${etat === "err" ? "text-alerte" : "text-ok"}`}>
        {pending ? "…" : ferme ? "Fermé" : etat ? (etat === "ok" ? `✓ ${msg}` : msg) : ""}
      </span>
    </div>
  );
}

"use client";
import { useState, useTransition } from "react";
import { voterNote } from "@/app/(site)/matchs/[id]/vote-actions";

/** La note d'un supporter pour un joueur (1 à 10), enregistrée dès qu'elle est choisie. */
export default function VoteNote({ matchId, playerId, initial, nom }: { matchId: string; playerId: string; initial: number | null; nom: string }) {
  const [v, setV] = useState(initial?.toString() ?? "");
  const [ok, setOk] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-1">
      <select aria-label={`Ma note pour ${nom}`} value={v} disabled={pending}
        onChange={(e) => { const n = e.target.value; setV(n); start(async () => { const r = await voterNote(matchId, playerId, Number(n)); setOk(!r.error); }); }}
        className={`rounded-lg border-2 px-1 py-0.5 text-sm font-bold bg-surface ${v ? "border-vin text-vin" : "border-trait text-sourdine"}`}>
        <option value="" disabled>Ma note</option>
        {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      {ok === false && <span className="text-alerte text-xs" role="alert">!</span>}
    </span>
  );
}

import { formeLabel, type Form } from "@/lib/algo";

/** Pastilles V/N/D des derniers matchs (du plus récent au plus ancien). */
export function Pastilles({ last5 }: { last5: string }) {
  return (
    <span className="inline-flex gap-1" aria-label={`Derniers matchs : ${last5.split("").map((c) => (c === "V" ? "victoire" : c === "N" ? "nul" : "défaite")).join(", ")}`}>
      {last5.split("").map((c, i) => (
        <span key={i} aria-hidden className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold ${c === "V" ? "bg-ok text-white" : c === "N" ? "bg-sourdine/40 text-encre" : "bg-alerte text-white"}`}>
          {c}
        </span>
      ))}
    </span>
  );
}

/** Jauge de forme 0-100. */
export default function Forme({ f, compact = false }: { f: Form; compact?: boolean }) {
  const l = formeLabel(f.form);
  if (compact) return <span className={`text-xs font-bold rounded-full px-2 py-0.5 tnum ${l.cls}`} title={`Forme ${f.form}/100`}>{f.form}</span>;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="titre text-4xl font-extrabold tnum">{f.form}</span>
        <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${l.cls}`}>{l.mot}</span>
      </div>
      <div className="mt-2 h-2.5 rounded-full bg-teinte overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-vin to-moutarde" style={{ width: `${f.form}%` }} />
      </div>
      <div className="mt-3"><Pastilles last5={f.last5} /></div>
    </div>
  );
}

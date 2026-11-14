"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Compte à rebours jusqu'au coup d'envoi ; à zéro, la page se recharge pour passer en direct. */
export default function CompteARebours({ kickoff }: { kickoff: string }) {
  const router = useRouter();
  const cible = new Date(kickoff).getTime();
  const [reste, setReste] = useState<number | null>(null);

  useEffect(() => {
    const maj = () => setReste(cible - Date.now());
    maj();
    const t = setInterval(maj, 1000);
    return () => clearInterval(t);
  }, [cible]);

  useEffect(() => {
    if (reste != null && reste <= 0 && reste > -1500) {
      const t = setTimeout(() => router.refresh(), 60_000);
      return () => clearTimeout(t);
    }
  }, [reste, router]);

  if (reste == null) return <div className="h-16" aria-hidden />;
  if (reste <= 0) return <p className="titre font-extrabold text-2xl text-moutarde">Coup d&apos;envoi !</p>;
  const j = Math.floor(reste / 86400e3), h = Math.floor((reste % 86400e3) / 3600e3), m = Math.floor((reste % 3600e3) / 60e3), s = Math.floor((reste % 60e3) / 1e3);
  const blocs: [number, string][] = j > 0 ? [[j, j > 1 ? "jours" : "jour"], [h, "h"], [m, "min"]] : [[h, "h"], [m, "min"], [s, "s"]];
  return (
    <div role="timer" aria-label={`Coup d'envoi dans ${j ? `${j} jours ` : ""}${h} heures ${m} minutes`} className="flex justify-center gap-2 sm:gap-3">
      {blocs.map(([v, u]) => (
        <span key={u} className="min-w-14 sm:min-w-16 rounded-xl bg-white/10 px-2 py-2 text-center">
          <span className="block titre font-extrabold text-3xl sm:text-4xl tnum leading-none">{String(v).padStart(2, "0")}</span>
          <span className="text-[11px] text-white/70">{u}</span>
        </span>
      ))}
    </div>
  );
}

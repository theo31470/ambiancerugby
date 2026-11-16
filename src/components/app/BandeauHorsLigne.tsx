"use client";
import { useEffect, useState } from "react";

/** Bandeau discret quand la connexion tombe : on consulte les dernières données gardées sur le téléphone. */
export default function BandeauHorsLigne() {
  const [hors, setHors] = useState(false);
  const [retour, setRetour] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const maj = () => {
      const h = !navigator.onLine;
      setHors((avant) => {
        if (avant && !h) { setRetour(true); clearTimeout(t); t = setTimeout(() => setRetour(false), 2500); }
        return h;
      });
    };
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => { window.removeEventListener("online", maj); window.removeEventListener("offline", maj); clearTimeout(t); };
  }, []);
  if (!hors && !retour) return null;
  return (
    <div role="status" className="hors-ligne fixed inset-x-3 z-[55] mx-auto max-w-sm rounded-2xl px-4 py-2.5 text-sm font-semibold text-center shadow-[0_10px_30px_-10px_rgba(0,0,0,.5)]"
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))", background: hors ? "var(--encre)" : "var(--ok, #2f7d4f)", color: "var(--fond)" }}>
      {hors ? "Hors connexion : vous voyez les dernières données gardées sur le téléphone." : "Connexion retrouvée"}
    </div>
  );
}

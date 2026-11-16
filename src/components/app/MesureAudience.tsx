"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Signale chaque page vue à la mesure d'audience maison (sans cookie, sans stockage sur l'appareil). */
export default function MesureAudience({ connecte, ignorer }: { connecte: boolean; ignorer: boolean }) {
  const chemin = usePathname();
  const premier = useRef(true);
  useEffect(() => {
    if (ignorer || navigator.webdriver) return;
    const entree = premier.current;
    premier.current = false;
    const q = new URLSearchParams(location.search);
    const nav = navigator as Navigator & { standalone?: boolean };
    const corps = JSON.stringify({
      p: chemin, e: entree,
      r: entree ? document.referrer || null : null,
      s: entree ? q.get("utm_source") : null, m: entree ? q.get("utm_medium") : null, c: q.get("utm_campaign"),
      a: matchMedia("(display-mode: standalone)").matches || !!nav.standalone || "Capacitor" in window,
      l: connecte,
    });
    try {
      if (!navigator.sendBeacon?.("/api/v", new Blob([corps], { type: "application/json" })))
        fetch("/api/v", { method: "POST", body: corps, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    } catch { /* mesure facultative */ }
  }, [chemin, connecte, ignorer]);
  return null;
}

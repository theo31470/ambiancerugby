"use client";
import { useEffect, useState } from "react";

/** Lien « Installer l'app » : rouvre le bandeau d'installation. Invisible dans l'app déjà installée. */
export default function BoutonInstaller({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const capacitor = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    const installe = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true || Boolean(capacitor?.isNativePlatform?.());
    const id = requestAnimationFrame(() => setVisible(!installe));
    return () => cancelAnimationFrame(id);
  }, []);
  if (!visible) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event("ar:installer"))} className={className}>
      Installer l&apos;app
    </button>
  );
}

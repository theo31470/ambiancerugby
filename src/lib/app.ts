/** Petits outils de l'app installée. */

/** L'app tourne-t-elle installée (écran d'accueil, ou app des stores) plutôt que dans un onglet du navigateur ? */
export function enApp() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return matchMedia("(display-mode: standalone)").matches || nav.standalone === true || Boolean(cap?.isNativePlatform?.());
}

/** Retour haptique léger (Android ; ignoré sans effet ailleurs). */
export function vibrer(ms: number | number[] = 8) {
  try { if ("vibrate" in navigator && !matchMedia("(prefers-reduced-motion: reduce)").matches) navigator.vibrate(ms); } catch { /* */ }
}

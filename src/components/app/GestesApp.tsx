"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ORIGINE = 24; // px depuis le bord gauche où le geste peut commencer
const SEUIL = 0.33; // part de l'écran à parcourir pour valider le retour

/**
 * Gestes et sens de navigation façon app :
 * - indique aux transitions de page si l'on avance, revient ou change d'onglet ;
 * - sur iPhone (app installée, qui n'a pas de bouton retour), glisser depuis le bord gauche revient à la page précédente.
 */
export default function GestesApp() {
  const chemin = usePathname();

  // sens de la prochaine transition
  useEffect(() => {
    const html = document.documentElement;
    let minuteur: ReturnType<typeof setTimeout> | undefined;
    const sens = (s: string) => {
      html.dataset.sens = s;
      clearTimeout(minuteur);
      minuteur = setTimeout(() => { delete html.dataset.sens; }, 900);
    };
    const clic = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || a.origin !== location.origin) return;
      if (a.closest(".barre-onglets, .entete, .sous-onglets, [data-sens-onglet]")) sens("onglet");
      else if (a.closest("[data-sens-retour]")) sens("retour");
      else sens("avant");
    };
    const retour = () => { if (html.dataset.sens !== "glisse") sens("retour"); };
    document.addEventListener("click", clic, true);
    window.addEventListener("popstate", retour);
    return () => { document.removeEventListener("click", clic, true); window.removeEventListener("popstate", retour); clearTimeout(minuteur); };
  }, []);

  // retour par glissement depuis le bord gauche (iPhone, app installée)
  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    if (!nav.standalone || chemin === "/") return;
    const page = document.getElementById("contenu");
    if (!page) return;
    const ombre = Object.assign(document.createElement("div"), { className: "retour-glisse-ombre" });
    const fleche = Object.assign(document.createElement("div"), { className: "retour-glisse-fleche" });
    fleche.innerHTML = '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.body.append(ombre, fleche);

    let x0 = 0, y0 = 0, t0 = 0, dx = 0, actif = false, decide = false, vibre = false;
    const largeur = () => window.innerWidth;
    const poser = (x: number, anime: boolean) => {
      const p = Math.min(1, x / largeur());
      const tr = anime ? "transform .28s cubic-bezier(.2,.8,.2,1), opacity .28s" : "none";
      page.style.transition = tr;
      page.style.transform = x ? `translateX(${x}px)` : "";
      page.style.boxShadow = x ? "-12px 0 30px -12px rgba(0,0,0,.35)" : "";
      ombre.style.transition = tr;
      ombre.style.opacity = String(0.18 * (1 - p) * (x ? 1 : 0));
      fleche.style.transition = anime ? "opacity .2s, transform .2s" : "none";
      fleche.style.opacity = String(Math.min(1, x / (largeur() * SEUIL)));
      fleche.style.transform = `translateX(${Math.min(x * 0.25, 30)}px) scale(${x >= largeur() * SEUIL ? 1.12 : 1})`;
    };
    const debut = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || t.clientX > ORIGINE || history.length < 2) return;
      x0 = t.clientX; y0 = t.clientY; t0 = performance.now(); dx = 0; actif = true; decide = false; vibre = false;
    };
    const bouge = (e: TouchEvent) => {
      if (!actif) return;
      const t = e.touches[0];
      const ddx = t.clientX - x0, ddy = t.clientY - y0;
      if (!decide) {
        if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
        decide = true;
        // geste surtout vertical : c'est un défilement, on laisse faire
        if (Math.abs(ddy) > Math.abs(ddx) || ddx < 0) { actif = false; return; }
      }
      e.preventDefault();
      dx = Math.max(0, ddx);
      poser(dx, false);
      const passe = dx >= largeur() * SEUIL;
      if (passe !== vibre) { vibre = passe; if (passe) try { navigator.vibrate?.(8); } catch { /* */ } }
    };
    const fin = () => {
      if (!actif) return;
      actif = false;
      const vitesse = dx / Math.max(1, performance.now() - t0);
      if (dx >= largeur() * SEUIL || (vitesse > 0.6 && dx > 40)) {
        poser(largeur(), true);
        document.documentElement.dataset.sens = "glisse";
        setTimeout(() => {
          history.back();
          // la nouvelle page s'affiche à sa place, sans animation de transition
          setTimeout(() => { poser(0, false); delete document.documentElement.dataset.sens; }, 350);
        }, 200);
      } else poser(0, true);
    };
    document.addEventListener("touchstart", debut, { passive: true });
    document.addEventListener("touchmove", bouge, { passive: false });
    document.addEventListener("touchend", fin);
    document.addEventListener("touchcancel", fin);
    return () => {
      document.removeEventListener("touchstart", debut);
      document.removeEventListener("touchmove", bouge);
      document.removeEventListener("touchend", fin);
      document.removeEventListener("touchcancel", fin);
      poser(0, false);
      ombre.remove(); fleche.remove();
    };
  }, [chemin]);

  return null;
}

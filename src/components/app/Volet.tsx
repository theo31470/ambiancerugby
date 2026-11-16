"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Volet qui monte du bas de l'écran, comme sur iPhone : on le ferme en le tirant vers le bas,
 * en touchant le fond ou avec Échap. Sur ordinateur, il s'affiche au centre.
 */
export default function Volet({ ouvert, fermer, titre, children }: { ouvert: boolean; fermer: () => void; titre: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const panneau = useRef<HTMLDivElement>(null);
  const doigt = useRef<{ y: number; t: number } | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouvert && !d.open) {
      d.showModal();
      document.documentElement.setAttribute("data-menu", "");
      try { navigator.vibrate?.(5); } catch { /* */ }
    }
    if (!ouvert && d.open) {
      // petite animation de sortie avant de fermer pour de bon
      d.setAttribute("data-sortie", "");
      const t = setTimeout(() => { d.removeAttribute("data-sortie"); d.close(); }, 200);
      document.documentElement.removeAttribute("data-menu");
      return () => clearTimeout(t);
    }
  }, [ouvert]);

  const poser = (y: number, anime: boolean) => {
    const p = panneau.current;
    if (!p) return;
    p.style.transition = anime ? "transform .22s cubic-bezier(.2,.8,.2,1)" : "none";
    p.style.transform = y ? `translateY(${y}px)` : "";
  };
  const debut = (e: React.TouchEvent) => {
    const p = panneau.current;
    // on ne tire le volet que depuis sa poignée, ou quand son contenu est tout en haut
    if (!p || (p.scrollTop > 0 && !(e.target as Element).closest("[data-poignee]"))) return;
    doigt.current = { y: e.touches[0].clientY, t: performance.now() };
  };
  const bouge = (e: React.TouchEvent) => {
    if (!doigt.current) return;
    const dy = e.touches[0].clientY - doigt.current.y;
    poser(Math.max(0, dy), false);
  };
  const fin = (e: React.TouchEvent) => {
    if (!doigt.current) return;
    const dy = e.changedTouches[0].clientY - doigt.current.y;
    const v = dy / Math.max(1, performance.now() - doigt.current.t);
    doigt.current = null;
    if (dy > 110 || (v > 0.5 && dy > 30)) { poser(window.innerHeight, true); setTimeout(() => { poser(0, false); fermer(); }, 180); }
    else poser(0, true);
  };

  return (
    <dialog ref={ref} aria-label={titre} onClose={fermer} onCancel={(e) => { e.preventDefault(); fermer(); }}
      onClick={(e) => { if (e.target === ref.current) fermer(); }}
      className="volet m-0 mt-auto sm:m-auto w-full max-w-none sm:max-w-md bg-transparent p-0 backdrop:bg-bordeaux/45">
      <div ref={panneau} onTouchStart={debut} onTouchMove={bouge} onTouchEnd={fin}
        className="volet-panneau max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl bg-fond text-encre shadow-[0_-12px_40px_-12px_rgba(42,20,25,.45)]"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <div data-poignee className="sticky top-0 bg-fond pt-2.5 pb-1 z-10">
          <span aria-hidden className="block mx-auto h-1.5 w-10 rounded-full bg-trait" />
          <p className="px-5 pt-3 titre font-bold text-lg">{titre}</p>
        </div>
        <div className="px-3 pb-2">{children}</div>
      </div>
    </dialog>
  );
}

/** Ligne d'action d'un volet (lien ou bouton). */
export function ActionVolet({ icone, children, sous, ...props }: { icone: ReactNode; children: ReactNode; sous?: string } & ({ href: string; onClick?: never } | { onClick: () => void; href?: never })) {
  const contenu = (
    <>
      <span className="w-10 h-10 rounded-xl bg-teinte text-vin grid place-items-center shrink-0">{icone}</span>
      <span className="flex-1 min-w-0 text-left"><span className="block font-semibold">{children}</span>{sous && <span className="block text-sm text-sourdine truncate">{sous}</span>}</span>
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 active:bg-teinte hover:bg-teinte transition-colors";
  return "href" in props && props.href ? <a href={props.href} className={cls}>{contenu}</a> : <button type="button" onClick={props.onClick} className={cls}>{contenu}</button>;
}

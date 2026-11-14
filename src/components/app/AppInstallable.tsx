"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";

/**
 * L'app installable (PWA) :
 * - enregistre le service worker (page hors ligne, fichiers en réserve, notifications push) ;
 * - propose d'installer l'app : bouton direct sur Android / Chrome / Edge, mode d'emploi sur iPhone ;
 * - se cache dans l'app installée et dans l'app des stores (Capacitor).
 * N'importe quel bouton du site peut rouvrir la proposition : window.dispatchEvent(new Event("ar:installer")).
 */

type InviteInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const CLE_REFUS = "ar-install-refus";
const PAUSE_JOURS = 21;
const DELAI_MS = 15000;

const lire = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const ecrire = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* navigation privée */ } };

function dejaInstalle() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  const capacitor = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true ||
    Boolean(capacitor?.isNativePlatform?.())
  );
}

function surIphone() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

function enPause() {
  const t = Number(lire(CLE_REFUS) ?? 0);
  return t > 0 && Date.now() - t < PAUSE_JOURS * 864e5;
}

export default function AppInstallable() {
  const invite = useRef<InviteInstall | null>(null);
  const [mode, setMode] = useState<"cache" | "bouton" | "iphone" | "merci">("cache");
  const [sortie, setSortie] = useState(false);

  // service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const go = () => navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
  }, []);

  // proposition d'installation
  useEffect(() => {
    if (dejaInstalle()) {
      document.documentElement.setAttribute("data-app", "");
      return;
    }
    let minuteur: ReturnType<typeof setTimeout> | undefined;
    const proposer = (force = false) => {
      if (!force && enPause()) return;
      if (invite.current) setMode("bouton");
      else if (surIphone()) setMode("iphone");
    };

    const surInvite = (e: Event) => {
      e.preventDefault(); // on garde la main : notre bandeau plutôt que celui du navigateur
      invite.current = e as InviteInstall;
      clearTimeout(minuteur);
      minuteur = setTimeout(() => proposer(), DELAI_MS);
    };
    const surInstalle = () => { invite.current = null; setMode("merci"); setTimeout(() => setMode("cache"), 3500); };
    const surDemande = () => proposer(true);

    window.addEventListener("beforeinstallprompt", surInvite);
    window.addEventListener("appinstalled", surInstalle);
    window.addEventListener("ar:installer", surDemande);
    // sur iPhone, pas d'invitation du navigateur : on propose après le même délai
    if (surIphone()) minuteur = setTimeout(() => proposer(), DELAI_MS);

    return () => {
      clearTimeout(minuteur);
      window.removeEventListener("beforeinstallprompt", surInvite);
      window.removeEventListener("appinstalled", surInstalle);
      window.removeEventListener("ar:installer", surDemande);
    };
  }, []);

  const fermer = (refus: boolean) => {
    if (refus) ecrire(CLE_REFUS, String(Date.now()));
    setSortie(true);
    setTimeout(() => { setMode("cache"); setSortie(false); }, 280);
  };

  const installer = async () => {
    const i = invite.current;
    if (!i) return;
    await i.prompt();
    const { outcome } = await i.userChoice;
    invite.current = null;
    if (outcome === "dismissed") fermer(true);
  };

  if (mode === "cache") return null;

  return (
    <div
      role="dialog"
      aria-label="Installer l'app Ambiance Rugby"
      data-sortie={sortie ? "" : undefined}
      className="invite-app fixed inset-x-3 z-[45] mx-auto max-w-md rounded-3xl bg-bordeaux text-white ring-1 ring-white/15 shadow-[0_18px_50px_-12px_rgba(42,20,25,.7)] overflow-hidden"
      style={{ bottom: "calc(max(var(--barre-onglets), env(safe-area-inset-bottom)) + 0.75rem)" }}
    >
      {/* lignes du terrain */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
        <g stroke="white" strokeOpacity=".07" strokeWidth="1.5">
          <line x1="22" y1="0" x2="22" y2="100" vectorEffect="non-scaling-stroke" />
          <line x1="50" y1="0" x2="50" y2="100" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          <line x1="78" y1="0" x2="78" y2="100" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>

      <div className="relative p-4 sm:p-5">
        {mode === "merci" ? (
          <div className="flex items-center gap-3 py-1">
            <img src="/icons/icon-192.png" alt="" className="invite-app-icone w-12 h-12 rounded-2xl" />
            <p className="groovy text-xl">Transformé ! L&apos;app est sur ton écran d&apos;accueil.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3.5">
              <img src="/icons/icon-192.png" alt="" className="invite-app-icone w-14 h-14 rounded-2xl shrink-0 shadow-[0_4px_0_0_rgba(0,0,0,.25)]" />
              <div className="min-w-0 flex-1">
                <p className="groovy text-[1.35rem] leading-tight text-moutarde">Le rugby dans ta poche</p>
                <p className="mt-1 text-sm text-white/80 leading-snug">
                  Installe l&apos;app : scores en direct, plein écran, à un tap de ton écran d&apos;accueil. Gratuit, sans passer par un store.
                </p>
              </div>
              <button onClick={() => fermer(true)} className="-mr-1 -mt-1 w-9 h-9 grid place-items-center rounded-full text-white/60 hover:text-white hover:bg-white/10 shrink-0" aria-label="Fermer">
                <svg viewBox="0 0 20 20" className="w-4 h-4" aria-hidden><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>

            {mode === "bouton" ? (
              <div className="mt-4 flex items-center gap-2">
                <button onClick={installer} className="bouton-or flex-1">Installer l&apos;app</button>
                <button onClick={() => fermer(true)} className="px-4 py-2.5 rounded-full text-sm font-semibold text-white/70 hover:text-white">Plus tard</button>
              </div>
            ) : (
              <ol className="mt-4 grid gap-2 text-sm">
                <li className="invite-app-etape flex items-center gap-3 rounded-2xl bg-white/[.07] px-3 py-2.5" style={{ ["--i" as string]: 0 }}>
                  <span className="w-6 h-6 rounded-full bg-moutarde text-bordeaux grid place-items-center text-xs font-bold shrink-0">1</span>
                  <span>
                    Touche
                    <svg viewBox="0 0 24 24" className="inline w-5 h-5 mx-1 -mt-1 text-moutarde" aria-label="Partager" role="img">
                      <path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M7 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <strong>Partager</strong> dans la barre de Safari
                  </span>
                </li>
                <li className="invite-app-etape flex items-center gap-3 rounded-2xl bg-white/[.07] px-3 py-2.5" style={{ ["--i" as string]: 1 }}>
                  <span className="w-6 h-6 rounded-full bg-moutarde text-bordeaux grid place-items-center text-xs font-bold shrink-0">2</span>
                  <span>
                    Choisis
                    <svg viewBox="0 0 24 24" className="inline w-5 h-5 mx-1 -mt-1 text-moutarde" aria-hidden>
                      <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <strong>Sur l&apos;écran d&apos;accueil</strong>
                  </span>
                </li>
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  );
}

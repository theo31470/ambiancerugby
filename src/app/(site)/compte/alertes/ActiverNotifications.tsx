"use client";
import { useEffect, useState } from "react";
import { enregistrerPush, oublierPush } from "./push-actions";

type Etat = "chargement" | "indispo" | "iphone" | "bloque" | "off" | "on" | "envoi";

const CLE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function cleOctets(b64: string) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

function appareil() {
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/mac/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "PC";
  return "Navigateur";
}

async function etatInitial(): Promise<Etat> {
  const nav = navigator as Navigator & { standalone?: boolean };
  const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !CLE) {
    // sur iPhone, le push n'existe que dans l'app ajoutée à l'écran d'accueil
    return iphone && !nav.standalone ? "iphone" : "indispo";
  }
  if (Notification.permission === "denied") return "bloque";
  const reg = await navigator.serviceWorker.getRegistration();
  const abo = await reg?.pushManager.getSubscription();
  return abo && Notification.permission === "granted" ? "on" : "off";
}

/** Notifications push : les alertes arrivent sur l'appareil même quand l'app est fermée. */
export default function ActiverNotifications() {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [erreur, setErreur] = useState(false);

  useEffect(() => { etatInitial().then(setEtat).catch(() => setEtat("indispo")); }, []);

  const activer = async () => {
    setErreur(false);
    setEtat("envoi");
    try {
      if ((await Notification.requestPermission()) !== "granted") return setEtat(Notification.permission === "denied" ? "bloque" : "off");
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;
      const abo = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleOctets(CLE) }));
      const r = await enregistrerPush(abo.toJSON() as Parameters<typeof enregistrerPush>[0], appareil());
      if (!r.ok) throw new Error();
      setEtat("on");
    } catch {
      setErreur(true);
      setEtat("off");
    }
  };

  const couper = async () => {
    setEtat("envoi");
    const reg = await navigator.serviceWorker.getRegistration();
    const abo = await reg?.pushManager.getSubscription();
    if (abo) { await oublierPush(abo.endpoint); await abo.unsubscribe().catch(() => {}); }
    setEtat("off");
  };

  if (etat === "chargement" || etat === "indispo") return null;

  if (etat === "on") {
    return (
      <div className="mb-6 rounded-2xl border border-trait bg-surface p-4 flex flex-wrap items-center gap-3">
        <span aria-hidden className="w-2.5 h-2.5 rounded-full bg-ok" />
        <p className="flex-1 min-w-48 text-sm font-semibold">Notifications activées sur cet appareil, même app fermée.</p>
        <button className="bouton-discret" onClick={couper}>Couper sur cet appareil</button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl bg-bordeaux text-white p-5 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-56">
        <p className="titre font-bold text-lg">Les essais en notification</p>
        <p className="mt-1 text-sm text-white/80">
          {etat === "iphone"
            ? "Sur iPhone, ajoutez d'abord l'app à l'écran d'accueil (Partager, puis Sur l'écran d'accueil), ouvrez-la et revenez ici."
            : etat === "bloque"
              ? "Les notifications sont bloquées pour Ambiance Rugby. Autorisez-les dans les réglages du navigateur ou du téléphone, puis revenez ici."
              : "Coup d'envoi, essais et score final de vos clubs, directement sur votre écran verrouillé, même quand l'app est fermée."}
        </p>
        {erreur && <p className="mt-2 text-sm text-moutarde font-semibold">L&apos;activation n&apos;a pas abouti. Réessayez dans un instant.</p>}
      </div>
      {etat === "iphone" ? (
        <button className="bouton-or" onClick={() => window.dispatchEvent(new Event("ar:installer"))}>Installer l&apos;app</button>
      ) : etat !== "bloque" && (
        <button className="bouton-or" disabled={etat === "envoi"} onClick={activer}>{etat === "envoi" ? "Activation…" : "Activer les notifications"}</button>
      )}
    </div>
  );
}

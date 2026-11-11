"use client";
import { useSyncExternalStore, useState } from "react";

const lire = () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);

/** Autorise les notifications du navigateur (affichées tant qu'un onglet du site est ouvert). */
export default function ActiverNotifications() {
  const initial = useSyncExternalStore(() => () => {}, lire, () => "default");
  const [etat, setEtat] = useState<string | null>(null);
  const perm = etat ?? initial;
  if (perm === "unsupported" || perm === "granted") {
    return perm === "granted" ? <p className="mb-6 text-sm text-ok font-semibold">Notifications activées sur cet appareil.</p> : null;
  }
  return (
    <div className="mb-6 rounded-2xl border border-trait bg-surface p-5 flex flex-wrap items-center gap-4">
      <p className="flex-1 min-w-56 text-sm">
        {perm === "denied"
          ? "Les notifications sont bloquées pour ce site dans votre navigateur. Autorisez-les dans ses réglages pour être prévenu pendant les matchs."
          : "Recevez aussi les alertes en notification sur cet appareil quand le site est ouvert."}
      </p>
      {perm === "default" && (
        <button className="bouton" onClick={async () => setEtat(await Notification.requestPermission())}>Activer les notifications</button>
      )}
    </div>
  );
}

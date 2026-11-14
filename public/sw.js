/* Service worker d'Ambiance Rugby (app installable / PWA)
 * - garde en réserve la page hors ligne, le logo et les fichiers statiques du site ;
 * - pages : toujours le réseau d'abord (scores frais), la page hors ligne si pas de connexion ;
 * - prêt pour les notifications push (matchs en direct, alertes).
 * Changer VERSION à chaque modification de ce fichier.
 */
const VERSION = "ar-v1";
const RESERVE = `reserve-${VERSION}`;
const STATIQUES = `statiques-${VERSION}`;
const HORS_LIGNE = "/hors-ligne.html";
const A_GARDER = [HORS_LIGNE, "/icons/icon-192.png", "/icons/icon-512.png", "/logo-blanc.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(RESERVE).then((c) => c.addAll(A_GARDER)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const noms = await caches.keys();
      await Promise.all(noms.filter((n) => !n.endsWith(VERSION)).map((n) => caches.delete(n)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

// seulement ce qui ne change jamais sous le même nom (fichiers Next versionnés, icônes de l'app)
const estStatique = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname.startsWith("/splash/");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // on ne touche qu'au site lui-même, jamais à l'API, au studio ni aux services externes (Supabase, Stripe…)
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/studio") || url.pathname.startsWith("/auth/")) return;

  // pages : réseau d'abord, page hors ligne si la connexion manque
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const pre = await event.preloadResponse;
          if (pre) return pre;
          return await fetch(req);
        } catch {
          return (await caches.match(HORS_LIGNE)) || Response.error();
        }
      })(),
    );
    return;
  }

  // fichiers statiques (versionnés par Next) : réserve d'abord, puis réseau
  if (estStatique(url)) {
    event.respondWith(
      (async () => {
        const deja = await caches.match(req);
        if (deja) return deja;
        const rep = await fetch(req);
        if (rep.ok && rep.type === "basic") {
          const copie = rep.clone();
          caches.open(STATIQUES).then((c) => c.put(req, copie));
        }
        return rep;
      })(),
    );
  }
});

/* ---------- notifications push ---------- */
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(
    self.registration.showNotification(d.title || "Ambiance Rugby", {
      body: d.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: d.tag,
      renotify: Boolean(d.tag),
      vibrate: [80, 40, 80],
      data: { url: d.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const f of fenetres) {
        if (f.url.startsWith(self.location.origin) && "focus" in f) {
          await f.focus();
          if ("navigate" in f) await f.navigate(cible);
          return;
        }
      }
      await self.clients.openWindow(cible);
    })(),
  );
});

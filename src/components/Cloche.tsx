"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/client";

/** Cloche d'alertes : compteur en direct + notification du navigateur si autorisée. */
export default function Cloche({ userId, initial }: { userId: string; initial: number }) {
  const [count, setCount] = useState(initial);
  const [secoue, setSecoue] = useState(false);

  useEffect(() => {
    const supabase = browserClient();
    const channel = supabase
      .channel(`alertes-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload: { new: unknown }) => {
        const n = payload.new as { title: string; body: string | null; url: string | null };
        setCount((c) => c + 1);
        setSecoue(true);
        setTimeout(() => setSecoue(false), 900);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          const notif = new Notification(n.title, { body: n.body ?? undefined, icon: "/icon.png" });
          notif.onclick = () => { if (n.url) window.location.href = n.url; };
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link href="/compte/alertes" className="relative w-10 h-10 grid place-items-center rounded-full hover:bg-white/10" aria-label={count ? `${count} alerte${count > 1 ? "s" : ""} non lue${count > 1 ? "s" : ""}` : "Alertes"}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className={secoue ? "animate-[roulis_.8s_ease-in-out]" : ""} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-moutarde text-bordeaux text-[10px] font-bold grid place-items-center tnum">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

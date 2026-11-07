"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { browserClient } from "@/lib/supabase/client";

/** Recharge la page (données serveur) quand un match ou un fait de jeu change. */
export default function LiveRefresh({ matchId }: { matchId?: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = browserClient();
    const schedule = () => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        router.refresh();
      }, 1500);
    };
    const filter = matchId ? `id=eq.${matchId}` : undefined;
    let channel = supabase.channel(`live-${matchId ?? "all"}`).on("postgres_changes", { event: "*", schema: "public", table: "matches", ...(filter ? { filter } : {}) }, schedule);
    if (matchId) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table: "match_events", filter: `match_id=eq.${matchId}` }, schedule);
    }
    channel.subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [matchId, router]);

  return null;
}

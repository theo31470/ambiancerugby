import { cache } from "react";
import { unstable_cache } from "next/cache";
import { publicClient } from "./supabase/server";

/** Réglage du décor de Noël : automatique (1er décembre → 6 janvier), forcé allumé ou éteint. */
export type ModeNoel = "auto" | "on" | "off";
export const MODES_NOEL: Record<ModeNoel, string> = { auto: "Automatique", on: "Allumé", off: "Éteint" };

const lireMode = unstable_cache(async (): Promise<ModeNoel> => {
  const { data } = await publicClient().rpc("mode_noel");
  return data === "on" || data === "off" ? data : "auto";
}, ["mode-noel"], { revalidate: 600, tags: ["mode-noel"] });

/** Du 1er décembre au 6 janvier inclus, heure de Paris. */
export function periodeNoel(d = new Date()) {
  const [m, j] = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", month: "numeric", day: "numeric" })
    .formatToParts(d).filter((p) => p.type !== "literal").reduce<number[]>((a, p) => (p.type === "month" ? [Number(p.value), a[1]] : [a[0], Number(p.value)]), [0, 0]);
  return m === 12 || (m === 1 && j <= 6);
}

export const modeNoel = cache(async (): Promise<ModeNoel> => { try { return await lireMode(); } catch { return "auto"; } });
export const noelActif = cache(async () => {
  if (process.env.MODE_NOEL === "on") return true; // essai en local

  const m = await modeNoel();
  return m === "on" || (m === "auto" && periodeNoel());
});

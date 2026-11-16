import { createHash } from "node:crypto";
import { after } from "next/server";
import { shopDb } from "@/lib/shop/admin";
import { arrivee, appareilDe, ROBOT } from "@/lib/audience/canal";

export const dynamic = "force-dynamic";

type Corps = { p?: string; r?: string | null; s?: string | null; m?: string | null; c?: string | null; e?: boolean; a?: boolean; l?: boolean };

/**
 * Mesure d'audience maison, sans cookie : chaque page vue est enregistrée avec une empreinte du jour
 * (IP + navigateur + date + secret), qui ne permet pas de retrouver la personne et change chaque jour.
 */
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || ROBOT.test(ua) || req.headers.get("purpose") === "prefetch") return new Response(null, { status: 204 });
  const b = (await req.json().catch(() => null)) as Corps | null;
  const chemin = typeof b?.p === "string" && b.p.startsWith("/") ? b.p.split("?")[0].slice(0, 300) : null;
  if (!chemin || chemin.startsWith("/studio") || chemin.startsWith("/api")) return new Response(null, { status: 204 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  const jour = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  const visiteur = createHash("sha256").update(`${ip}|${ua}|${jour}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest("hex").slice(0, 20);
  const hote = new URL(req.url).hostname.replace(/^www\./, "");
  const a = b?.e ? arrivee(b.r ?? null, ua, { source: b.s, medium: b.m }, hote) : null;
  const ville = req.headers.get("x-vercel-ip-city");
  const ligne = {
    visiteur, chemin, entree: !!b?.e,
    canal: a?.canal ?? null, source: a?.source?.slice(0, 120) ?? null, campagne: b?.c?.slice(0, 120) || null,
    ...appareilDe(ua),
    pays: req.headers.get("x-vercel-ip-country"), ville: ville ? decodeURIComponent(ville).slice(0, 80) : null,
    app: !!b?.a, connecte: !!b?.l,
  };
  after(async () => { await shopDb().from("visites").insert(ligne); });
  return new Response(null, { status: 204 });
}

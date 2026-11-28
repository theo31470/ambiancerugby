import { NextResponse } from "next/server";
import { shopDb } from "@/lib/shop/admin";

/** Outil interne (temporaire) : extraits bruts d'une page LNR / FFR / EPCR autour d'un mot, pour écrire un relevé. */
export const dynamic = "force-dynamic";
const HOTES = /(^|\.)(lnr\.fr|ffr\.fr|epcrugby\.com|world\.rugby)$/;

export async function GET(req: Request) {
  const { data: ok } = await shopDb().rpc("cron_secret_ok", { p_secret: req.headers.get("x-sync-secret") });
  if (ok !== true) return NextResponse.json({ erreur: "interdit" }, { status: 401 });
  const u = new URL(req.url);
  const cible = u.searchParams.get("url") ?? "";
  const mot = u.searchParams.get("mot") ?? "diffus";
  let hote = "";
  try { hote = new URL(cible).hostname; } catch { /* vide */ }
  if (!HOTES.test(hote)) return NextResponse.json({ erreur: "hôte non autorisé" }, { status: 400 });
  const r = await fetch(cible, { cache: "no-store", headers: { "user-agent": "Mozilla/5.0 (compatible; AmbianceRugby/1.0)", accept: "text/html" } });
  const html = await r.text();
  const re = new RegExp(mot, "gi");
  const extraits: string[] = [];
  for (const x of html.matchAll(re)) { if (extraits.length >= 8) break; extraits.push(html.slice(Math.max(0, x.index! - 600), x.index! + 600)); }
  return NextResponse.json({ statut: r.status, taille: html.length, n: extraits.length, extraits });
}

import { ImageResponse } from "next/og";
import { getViewer } from "@/lib/supabase/server";
import { donneesApresMatch, type ApresMatch } from "@/lib/contenu/apres-match";
import { FORMAT, SLIDES_APRES_MATCH, polices } from "@/lib/contenu/visuel";
import { VUES_APRES_MATCH } from "@/components/visuels/ApresMatch";

const TOTAL = SLIDES_APRES_MATCH.length;

/** Carrousel d'après-match (PNG 1080 × 1350), réservé à la rédaction. ?slide=1..5, &dl=1 pour télécharger. */
export async function GET(req: Request, ctx: RouteContext<"/api/visuels/apres-match/[id]">) {
  const viewer = await getViewer();
  const essaiLocal = process.env.NODE_ENV === "development" && process.env.VISUELS_SANS_AUTH === "1";
  if (!essaiLocal && (!viewer || viewer.role === "user")) return new Response("Réservé à la rédaction", { status: 403 });
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const n = Math.min(TOTAL, Math.max(1, Number(url.searchParams.get("slide")) || 1));
  // essai local sans base : données figées d'un vrai match (VISUELS_DEMO = chemin d'un JSON)
  const d: ApresMatch | null = essaiLocal && process.env.VISUELS_DEMO
    ? JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(process.env.VISUELS_DEMO!, "utf8")))
    : await donneesApresMatch(id);
  if (!d) return new Response("Match introuvable ou pas encore joué", { status: 404 });

  const Vue = VUES_APRES_MATCH[n - 1];
  const img = new ImageResponse(<Vue d={d} page={n} />, { ...FORMAT, fonts: polices() });
  if (url.searchParams.get("dl")) {
    const nom = `${d.dom.court}-${d.ext.court}-${n}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase();
    img.headers.set("content-disposition", `attachment; filename="${nom}.png"`);
  }
  img.headers.set("cache-control", "private, max-age=60");
  return img;
}


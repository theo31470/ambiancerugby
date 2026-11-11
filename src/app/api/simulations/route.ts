import { shopDb } from "@/lib/shop/admin";
import { simuler, type Zones } from "@/lib/simulation";
import { zonesFor } from "@/components/StandingsTable";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Chaque matin : les chances de chaque club (Top 14, Pro D2) sont recalculées et gardées jour par jour
 * (courbe d'évolution du simulateur). Quand un club entre dans le top 6 ou en sort (cap des 50 %),
 * ses Supporters qui l'ont demandé reçoivent une alerte.
 */
export async function GET(req: Request) {
  const db = shopDb();
  const { data: ok } = await db.rpc("cron_secret_ok", { p_secret: req.headers.get("x-sync-secret") });
  if (!ok) return new Response("non autorisé", { status: 401 });
  const jour = new Date().toISOString().slice(0, 10);
  const bilan: Record<string, number> = {};

  for (const slug of ["top-14", "pro-d2"]) {
    const { data: c } = await db.from("competitions").select("id, current_season, short_name, name").eq("slug", slug).maybeSingle();
    if (!c) continue;
    const [{ data: st }, { data: ms }, { data: rt }] = await Promise.all([
      db.from("standings").select("team_id, points, played, won, points_for, points_against").eq("competition_id", c.id).eq("season", c.current_season),
      db.from("matches").select("id, home_team_id, away_team_id, round").eq("competition_id", c.id).eq("season", c.current_season).in("status", ["scheduled", "postponed", "live", "halftime"]),
      db.from("team_ratings").select("team_id, rating"),
    ]);
    if (!st?.length || !ms?.length) continue;
    const note = new Map((rt ?? []).map((r) => [r.team_id, Number(r.rating)]));
    const equipes = st.map((s) => ({ id: s.team_id, points: s.points, joues: s.played, victoires: s.won, diff: s.points_for - s.points_against, rating: note.get(s.team_id) ?? 1500 }));
    const z = zonesFor(slug);
    const zones: Zones = { qualif: z.qualif ?? 2, barrage: z.barrage ?? 6, descente: z.descente ?? 1, acces: slug === "top-14" ? 13 : undefined };
    const r = simuler(equipes, ms.map((m) => ({ id: m.id, dom: m.home_team_id, ext: m.away_team_id, journee: m.round })), {}, zones, 6000, Number(jour.replace(/-/g, "")) % 100000);
    const N = equipes.length;
    const lignes = equipes.map((e) => {
      const p = r.places[e.id];
      return {
        competition_id: c.id, team_id: e.id, jour,
        p_top2: p.slice(0, zones.qualif).reduce((s, x) => s + x, 0), p_phase: p.slice(0, zones.barrage).reduce((s, x) => s + x, 0),
        p_descente: p.slice(N - zones.descente).reduce((s, x) => s + x, 0), points_proj: r.pointsMoyens[e.id],
      };
    });
    // la veille, pour repérer les clubs qui franchissent la barre des 50 %
    const { data: hier } = await db.from("sim_historique").select("team_id, p_phase").eq("competition_id", c.id).lt("jour", jour).order("jour", { ascending: false }).limit(N);
    const avant = new Map((hier ?? []).map((h) => [h.team_id, Number(h.p_phase)]));
    await db.from("sim_historique").upsert(lignes);
    bilan[slug] = lignes.length;

    for (const l of lignes) {
      const a = avant.get(l.team_id);
      if (a == null || (a >= 0.5) === (l.p_phase >= 0.5)) continue;
      const entre = l.p_phase >= 0.5;
      const { data: t } = await db.from("teams").select("short_name, name").eq("id", l.team_id).single();
      const nom = t?.short_name ?? t?.name ?? "Votre club";
      const { data: fans } = await db.from("profiles").select("id, prefs").eq("favorite_team_id", l.team_id);
      const { data: fans2 } = await db.from("favorite_teams").select("user_id").eq("team_id", l.team_id);
      const ids = [...new Set([...(fans ?? []).map((f) => f.id), ...(fans2 ?? []).map((f) => f.user_id)])];
      if (!ids.length) continue;
      const { data: profils } = await db.from("profiles").select("id, prefs, plan, plan_until, role").in("id", ids);
      const cibles = (profils ?? []).filter((p) => (p.role !== "user" || (p.plan === "supporter" && (!p.plan_until || new Date(p.plan_until) > new Date()))) && (p.prefs as Record<string, unknown> | null)?.alertes_simulateur !== false);
      if (cibles.length) await db.from("notifications").insert(cibles.map((p) => ({
        user_id: p.id, kind: "simulateur",
        title: entre ? `${nom} entre dans le top 6 du simulateur` : `${nom} sort du top 6 du simulateur`,
        body: `${Math.round(l.p_phase * 100)} % de chances de phase finale (${Math.round(a * 100)} % hier).`,
        url: `/competitions/${slug}?vue=simulateur`,
      })));
    }
  }
  return Response.json({ ok: true, bilan });
}

/**
 * Fil du match positionné sur le terrain (Sportradar, rugby à XV).
 * Coordonnées en mètres : x de 0 à 100 dans la longueur (au-delà = en-but), y de 0 à 70 dans la largeur.
 * L'équipe qui reçoit attaque toujours vers la droite (x croissant).
 */
export type Cote = "h" | "a";
export type ActionTerrain = { k: string; m: number | null; c: Cote | null; x: number | null; y: number | null; j?: string[] };

const ACCES = process.env.SPORTRADAR_ACCES ?? "trial";

/** Lit le fil Sportradar d'un match et le ramène à nos équipes (domicile / extérieur). */
export async function lireFilSportradar(srId: string, score: { dom: number | null; ext: number | null }): Promise<ActionTerrain[]> {
  const cle = process.env.SPORTRADAR_KEY;
  if (!cle) throw new Error("La clé SPORTRADAR_KEY n'est pas configurée sur Vercel.");
  if (!/^sr:sport_event:\d+$/.test(srId)) throw new Error("Identifiant attendu : sr:sport_event:12345678");
  const res = await fetch(`https://api.sportradar.com/rugby-union/${ACCES}/v3/fr/sport_events/${srId}/timeline.json`, {
    headers: { "x-api-key": cle }, cache: "no-store", signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 403 || res.status === 401) throw new Error("Sportradar refuse la clé (essai expiré ou quota atteint).");
  if (res.status === 429) throw new Error("Quota Sportradar atteint pour le moment.");
  if (!res.ok) throw new Error(`Sportradar : HTTP ${res.status}`);
  const body = await res.json();
  const statut = body?.sport_event_status ?? {};
  // si Sportradar inverse domicile / extérieur par rapport à nous, on retourne tout
  const inverse = score.dom != null && score.ext != null && score.dom !== score.ext
    && statut.home_score === score.ext && statut.away_score === score.dom;
  type Ev = { type: string; match_time?: number; competitor?: "home" | "away"; x?: number; y?: number; players?: { name: string }[] };
  return ((body?.timeline ?? []) as Ev[])
    .filter((e) => !["period_start", "break_start", "match_started", "match_ended", "period_score"].includes(e.type))
    .map((e) => {
      let c: Cote | null = e.competitor === "home" ? "h" : e.competitor === "away" ? "a" : null;
      let x = typeof e.x === "number" ? e.x : null;
      if (inverse) { c = c === "h" ? "a" : c === "a" ? "h" : null; if (x != null) x = 100 - x; }
      const j = (e.players ?? []).map((p) => p.name.includes(",") ? p.name.split(",").map((s) => s.trim()).reverse().join(" ") : p.name);
      return { k: e.type, m: e.match_time ?? null, c, x, y: typeof e.y === "number" ? e.y : null, ...(j.length ? { j } : {}) };
    });
}

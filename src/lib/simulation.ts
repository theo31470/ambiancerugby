/**
 * Simulateur de fin de saison (Top 14, Pro D2) : on rejoue des milliers de fois les matchs restants
 * à partir de l'Indice Ambiance de chaque club, avec les vrais barèmes LNR :
 * 4 points la victoire, 2 le nul, +1 bonus offensif (3 essais de plus que l'adversaire),
 * +1 bonus défensif (défaite de 5 points ou moins).
 * Fonctions pures : elles tournent dans le navigateur, rien n'est envoyé au serveur.
 */

export type EquipeSim = { id: string; points: number; joues: number; victoires: number; diff: number; rating: number };
export type MatchSim = { id: string; dom: string; ext: string; journee: string | null };
/** Résultat imposé par le visiteur. */
export type Force = "dom" | "nul" | "ext";
export type Zones = { qualif: number; barrage: number; descente: number; acces?: number };

export type ResultatSim = {
  /** proba[équipe][place-1] */
  places: Record<string, number[]>;
  pointsMoyens: Record<string, number>;
  rangMoyen: Record<string, number>;
  /** P(top 6) selon le nombre de victoires restantes : victoiresQualif[équipe][k] = { n, q } */
  victoires: Record<string, { n: number; q: number }[]>;
  restants: Record<string, number>;
  simulations: number;
};

const AVANTAGE = 50;

/** Petit générateur pseudo-aléatoire reproductible (mulberry32). */
function hasard(graine: number) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normale(r: () => number) {
  const u = Math.max(r(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

export function simuler(equipes: EquipeSim[], matchs: MatchSim[], forces: Record<string, Force>, zones: Zones, n = 4000, graine = 7): ResultatSim {
  const r = hasard(graine);
  const ids = equipes.map((e) => e.id);
  const idx = new Map(ids.map((id, i) => [id, i]));
  const N = ids.length;
  const base = equipes.map((e) => e.points);
  const diffBase = equipes.map((e) => e.diff);
  const rating = equipes.map((e) => e.rating);
  const places = ids.map(() => new Array(N).fill(0));
  const sommePts = new Array(N).fill(0);
  const sommeRang = new Array(N).fill(0);
  const restants = new Array(N).fill(0);
  const jouables = matchs.filter((m) => idx.has(m.dom) && idx.has(m.ext));
  for (const m of jouables) { restants[idx.get(m.dom)!]++; restants[idx.get(m.ext)!]++; }
  const maxV = Math.max(0, ...restants);
  const vq = ids.map(() => Array.from({ length: maxV + 1 }, () => ({ n: 0, q: 0 })));

  const pts = new Array(N);
  const diff = new Array(N);
  const vic = new Array(N);
  const ordre = ids.map((_, i) => i);

  for (let s = 0; s < n; s++) {
    for (let i = 0; i < N; i++) { pts[i] = base[i]; diff[i] = diffBase[i]; vic[i] = 0; }
    for (const m of jouables) {
      const h = idx.get(m.dom)!, a = idx.get(m.ext)!;
      const f = forces[m.id];
      // écart attendu : 1 point de marge pour 10 points d'Indice, dispersion d'un match de rugby
      const mu = (rating[h] + AVANTAGE - rating[a]) / 10;
      let marge = Math.round(mu + normale(r) * 13);
      if (f === "dom") marge = Math.max(1, Math.abs(marge));
      else if (f === "ext") marge = -Math.max(1, Math.abs(marge));
      else if (f === "nul") marge = 0;
      diff[h] += marge; diff[a] -= marge;
      if (marge === 0) { pts[h] += 2; pts[a] += 2; continue; }
      const g = marge > 0 ? h : a, p = marge > 0 ? a : h;
      const ecart = Math.abs(marge);
      pts[g] += 4; vic[g]++;
      if (ecart <= 5) pts[p] += 1;
      // bonus offensif plus probable quand l'écart grandit
      if (r() < Math.min(0.75, Math.max(0, (ecart - 6) / 26))) pts[g] += 1;
    }
    ordre.sort((x, y) => pts[y] - pts[x] || diff[y] - diff[x] || r() - 0.5);
    for (let rang = 0; rang < N; rang++) {
      const i = ordre[rang];
      places[i][rang]++;
      sommePts[i] += pts[i];
      sommeRang[i] += rang + 1;
      const c = vq[i][vic[i]];
      c.n++;
      if (rang < zones.barrage) c.q++;
    }
  }
  const out: ResultatSim = { places: {}, pointsMoyens: {}, rangMoyen: {}, victoires: {}, restants: {}, simulations: n };
  ids.forEach((id, i) => {
    out.places[id] = places[i].map((x) => x / n);
    out.pointsMoyens[id] = sommePts[i] / n;
    out.rangMoyen[id] = sommeRang[i] / n;
    out.victoires[id] = vq[i];
    out.restants[id] = restants[i];
  });
  return out;
}

/** Nombre de victoires restantes qui assure la phase finale 9 fois sur 10 (null si hors de portée ou déjà acquis). */
export function victoiresNecessaires(v: { n: number; q: number }[], seuil = 0.9) {
  for (let k = 0; k < v.length; k++) if (v[k].n >= 20 && v[k].q / v[k].n >= seuil) return k;
  return null;
}

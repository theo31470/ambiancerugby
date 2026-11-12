/**
 * Saisie assistée : Claude lit un compte rendu ou une photo de feuille de match
 * et propose les marqueurs et cartons. Modèle le moins cher de l'API (Haiku).
 */
export const IA_MODELE = "claude-haiku-5-5";
// tarifs Haiku 5.5 (USD par million de tokens, requêtes de moins de 100 000 tokens)
const PRIX_ENTREE = 0.1;
const PRIX_SORTIE = 0.5;
/** Plafond dur des dépenses Claude par mois, en dollars (≈ 11 €, sous la limite de 15 € fixée par Théo). */
export const IA_PLAFOND_MOIS_USD = 12;
const MAX_TEXTE = 40_000; // caractères : garde chaque requête bien sous 100 000 tokens

export type JoueurRef = { ref: string; nom: string; poste: string | null };
export type LigneIA = {
  equipe: "home" | "away";
  ref: string | null;
  nom_lu: string;
  essais: number;
  transformations: number;
  penalites: number;
  drops: number;
  cartons_jaunes: number;
  cartons_rouges: number;
};
export type EvenementIA = { minute: number | null; equipe: "home" | "away"; ref: string | null; nom_lu: string; type: "try" | "conversion" | "penalty" | "drop" | "penalty_try" | "yellow" | "red" };
export type ResultatIA = { lignes: LigneIA[]; evenements: EvenementIA[]; remarques: string; inputTokens: number; outputTokens: number; coutUsd: number };
const TYPES_EVT = ["try", "conversion", "penalty", "drop", "penalty_try", "yellow", "red"] as const;

/** Nettoie le fil du match renvoyé par Claude. */
function filPropre(brut: unknown): EvenementIA[] {
  if (!Array.isArray(brut)) return [];
  return brut
    .filter((e) => e && (e.equipe === "home" || e.equipe === "away") && TYPES_EVT.includes(e.type))
    .map((e) => ({
      minute: Number.isInteger(e.minute) && e.minute >= 0 && e.minute <= 130 ? e.minute : null,
      equipe: e.equipe, ref: typeof e.ref === "string" ? e.ref : null, nom_lu: String(e.nom_lu ?? "").slice(0, 80), type: e.type,
    }))
    .slice(0, 80);
}

const OUTIL = {
  name: "feuille_de_match",
  description: "Enregistre les marqueurs et les cartons d'un match de rugby à XV.",
  input_schema: {
    type: "object",
    properties: {
      lignes: {
        type: "array",
        description: "Une ligne par joueur ayant marqué des points ou reçu un carton. Ne pas lister les autres joueurs.",
        items: {
          type: "object",
          properties: {
            equipe: { type: "string", enum: ["home", "away"], description: "home = équipe qui reçoit, away = équipe qui se déplace" },
            ref: { type: ["string", "null"], description: "Référence du joueur dans la liste fournie (ex. H12, A3), ou null si le joueur n'y figure pas" },
            nom_lu: { type: "string", description: "Le nom tel qu'il apparaît dans le document" },
            essais: { type: "integer", minimum: 0 },
            transformations: { type: "integer", minimum: 0 },
            penalites: { type: "integer", minimum: 0, description: "Pénalités réussies" },
            drops: { type: "integer", minimum: 0, description: "Drops réussis" },
            cartons_jaunes: { type: "integer", minimum: 0 },
            cartons_rouges: { type: "integer", minimum: 0 },
          },
          required: ["equipe", "ref", "nom_lu", "essais", "transformations", "penalites", "drops", "cartons_jaunes", "cartons_rouges"],
        },
      },
      evenements: {
        type: "array",
        description: "Le fil du match dans l'ordre chronologique, seulement si le document donne les minutes. Liste vide sinon.",
        items: {
          type: "object",
          properties: {
            minute: { type: ["integer", "null"], minimum: 0, maximum: 130 },
            equipe: { type: "string", enum: ["home", "away"] },
            ref: { type: ["string", "null"], description: "Référence du joueur (H12, A3…) ou null" },
            nom_lu: { type: "string" },
            type: { type: "string", enum: ["try", "conversion", "penalty", "drop", "penalty_try", "yellow", "red"], description: "try = essai, conversion = transformation, penalty = pénalité réussie, drop, penalty_try = essai de pénalité, yellow / red = cartons" },
          },
          required: ["minute", "equipe", "ref", "nom_lu", "type"],
        },
      },
      remarques: { type: "string", description: "En français, très court : essais de pénalité, incohérences avec le score, doutes sur un nom. Vide si rien à signaler." },
    },
    required: ["lignes", "evenements", "remarques"],
  },
} as const;

export async function analyserFeuille(opts: {
  domicile: string; exterieur: string; scoreDom: number | null; scoreExt: number | null;
  effectifDom: JoueurRef[]; effectifExt: JoueurRef[]; texte: string; image: { type: string; base64: string } | null;
}): Promise<ResultatIA> {
  const cle = process.env.ANTHROPIC_API_KEY;
  if (!cle) throw new Error("La clé ANTHROPIC_API_KEY n'est pas encore configurée sur Vercel.");

  const liste = (l: JoueurRef[]) => l.map((j) => `${j.ref} : ${j.nom}${j.poste ? ` (${j.poste})` : ""}`).join("\n");
  const consigne = [
    `Match : ${opts.domicile} (home) contre ${opts.exterieur} (away).`,
    opts.scoreDom != null && opts.scoreExt != null ? `Score final officiel : ${opts.scoreDom} – ${opts.scoreExt}.` : "Score final inconnu.",
    "",
    `Effectif ${opts.domicile} (home) :`, liste(opts.effectifDom) || "(vide)",
    "",
    `Effectif ${opts.exterieur} (away) :`, liste(opts.effectifExt) || "(vide)",
    "",
    "À partir du document ci-dessous (compte rendu, feuille de match ou capture), relève pour chaque joueur ses essais, transformations réussies, pénalités réussies, drops réussis et cartons.",
    "Relie chaque joueur à sa référence dans les listes ci-dessus (attention aux accents, prénoms abrégés et surnoms). S'il n'y figure pas, mets ref à null.",
    "Un essai de pénalité ne se rattache à aucun joueur : signale-le dans les remarques. N'invente rien : seulement ce que dit le document.",
    "Vérifie que 5 × essais + 2 × transformations + 3 × (pénalités + drops) donne bien le score de chaque équipe, et signale tout écart.",
    "Si le document donne les minutes, remplis aussi le fil du match (evenements) dans l'ordre chronologique ; sinon laisse-le vide.",
    "",
    "Document :",
    opts.texte.slice(0, MAX_TEXTE) || "(voir l'image)",
  ].join("\n");

  const contenu: unknown[] = [];
  if (opts.image) contenu.push({ type: "image", source: { type: "base64", media_type: opts.image.type, data: opts.image.base64 } });
  contenu.push({ type: "text", text: consigne });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": cle, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: IA_MODELE,
      max_tokens: 2000,
      system: "Tu es secrétaire de rédaction d'un média rugby. Tu relèves les marqueurs et les cartons avec une exactitude absolue.",
      tools: [OUTIL],
      tool_choice: { type: "tool", name: OUTIL.name },
      messages: [{ role: "user", content: contenu }],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    if (res.status === 401) throw new Error("Clé Claude refusée : vérifiez ANTHROPIC_API_KEY sur Vercel.");
    if (res.status === 429 || res.status === 529) throw new Error("Claude est très sollicité, réessayez dans une minute.");
    throw new Error(`Claude : ${msg}`);
  }
  const outil = (body?.content ?? []).find((c: { type: string }) => c.type === "tool_use");
  const inputTokens = body?.usage?.input_tokens ?? 0;
  const outputTokens = body?.usage?.output_tokens ?? 0;
  const coutUsd = (inputTokens * PRIX_ENTREE + outputTokens * PRIX_SORTIE) / 1e6;
  const brut = (outil?.input ?? {}) as { lignes?: LigneIA[]; evenements?: unknown; remarques?: string };
  const n = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < 30 ? (v as number) : 0);
  const lignes = (brut.lignes ?? [])
    .filter((l) => l && (l.equipe === "home" || l.equipe === "away"))
    .map((l) => ({
      equipe: l.equipe, ref: typeof l.ref === "string" ? l.ref : null, nom_lu: String(l.nom_lu ?? "").slice(0, 80),
      essais: n(l.essais), transformations: n(l.transformations), penalites: n(l.penalites), drops: n(l.drops),
      cartons_jaunes: n(l.cartons_jaunes), cartons_rouges: n(l.cartons_rouges),
    }));
  return { lignes, evenements: filPropre(brut.evenements), remarques: String(brut.remarques ?? "").slice(0, 600), inputTokens, outputTokens, coutUsd };
}

// ---------- recherche autonome sur le web ----------
// Bases de statistiques d'autres sites exclues. Les feuilles de match publiques (LNR, FFR, ligues, clubs) et la presse sont lues.
export const SITES_EXCLUS = ["all.rugby", "allrugby.com", "turnover-rugby.fr", "itsrugby.fr", "statbunker.com"];
const PRIX_RECHERCHE = 0.01; // 10 $ les 1 000 recherches

export async function chercherFeuille(opts: {
  domicile: string; exterieur: string; competition: string; date: string; scoreDom: number | null; scoreExt: number | null;
  effectifDom: JoueurRef[]; effectifExt: JoueurRef[];
}): Promise<ResultatIA & { recherches: number }> {
  const cle = process.env.ANTHROPIC_API_KEY;
  if (!cle) throw new Error("La clé ANTHROPIC_API_KEY n'est pas encore configurée sur Vercel.");
  const liste = (l: JoueurRef[]) => l.map((j) => `${j.ref} : ${j.nom}${j.poste ? ` (${j.poste})` : ""}`).join("\n");
  const consigne = [
    `Match de ${opts.competition} du ${opts.date} : ${opts.domicile} (home) contre ${opts.exterieur} (away).`,
    opts.scoreDom != null && opts.scoreExt != null ? `Score final officiel : ${opts.scoreDom} – ${opts.scoreExt}.` : "",
    "",
    "Cherche sur le web la feuille de match officielle (site de la ligue : top14.lnr.fr ou prod2.lnr.fr « feuille de match », ffr.fr, epcrugby.com, premiershiprugby.com, unitedrugby.com) ou un compte rendu de presse (L'Équipe, Midi Olympique, Rugbyrama, presse régionale, BBC…) ou le site d'un des deux clubs.",
    "Fais au plus 3 recherches, n'écris aucun texte : appelle directement l'outil feuille_de_match dès que tu as les marqueurs.",
    "Relève pour chaque joueur ses essais, transformations réussies, pénalités réussies, drops réussis et cartons, puis appelle l'outil feuille_de_match.",
    "Relie chaque joueur à sa référence dans les listes ci-dessous. S'il n'y figure pas, mets ref à null. Un essai de pénalité ne se rattache à aucun joueur : signale-le dans les remarques.",
    "Si les comptes rendus donnent les minutes (essais, pénalités, cartons…), remplis aussi le fil du match (evenements) dans l'ordre chronologique ; sinon laisse-le vide.",
    "Si tu ne trouves pas d'information fiable, appelle feuille_de_match avec des listes vides et explique pourquoi dans les remarques. N'invente jamais.",
    "",
    `Effectif ${opts.domicile} (home) :`, liste(opts.effectifDom) || "(vide)",
    "",
    `Effectif ${opts.exterieur} (away) :`, liste(opts.effectifExt) || "(vide)",
  ].join("\n");

  const outils = [
    { type: "web_search_20250305", name: "web_search", max_uses: 3, blocked_domains: SITES_EXCLUS },
    OUTIL,
  ];
  const messages: { role: "user" | "assistant"; content: unknown }[] = [{ role: "user", content: consigne }];
  let inputTokens = 0, outputTokens = 0, recherches = 0;
  let outil: { input?: unknown } | undefined;
  // la recherche peut demander plusieurs allers-retours (« pause_turn ») : trois au maximum
  // dernier tour : on oblige Claude à remplir la feuille avec ce qu'il a trouvé (avant, il pouvait s'arrêter sur du texte)
  for (let tour = 0; tour < 4 && !outil; tour++) {
    const dernier = tour === 3;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": cle, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: IA_MODELE, max_tokens: 6000,
        system: "Tu es secrétaire de rédaction d'un média rugby. Tu relèves les marqueurs et les cartons avec une exactitude absolue, à partir de feuilles de match et de la presse. Tu ne rédiges jamais de texte : tu appelles l'outil feuille_de_match.",
        tools: outils, messages,
        ...(dernier ? { tool_choice: { type: "tool", name: OUTIL.name } } : {}),
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) throw new Error("Clé Claude refusée : vérifiez ANTHROPIC_API_KEY sur Vercel.");
      if (res.status === 429 || res.status === 529) throw new Error("Claude est très sollicité, réessayez dans une minute.");
      throw new Error(`Claude : ${body?.error?.message ?? `HTTP ${res.status}`}`);
    }
    inputTokens += body?.usage?.input_tokens ?? 0;
    outputTokens += body?.usage?.output_tokens ?? 0;
    recherches += body?.usage?.server_tool_use?.web_search_requests ?? 0;
    outil = (body?.content ?? []).find((c: { type: string; name?: string }) => c.type === "tool_use" && c.name === OUTIL.name);
    if (outil) break;
    // recherche en pause : on relance tel quel ; arrêt sur du texte : on garde ce qu'il a lu et on exige la feuille
    const contenu = (body?.content ?? []) as { type: string }[];
    if (body?.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: contenu }); continue; }
    const utile = contenu.filter((c) => c.type !== "text" || (c as { text?: string }).text?.trim());
    if (utile.length) messages.push({ role: "assistant", content: utile });
    messages.push({ role: "user", content: "Appelle maintenant l'outil feuille_de_match avec ce que tu as trouvé (listes vides et explication dans remarques si rien de fiable)." });
    tour = Math.max(tour, 2);
  }
  // au-delà de 100 000 tokens, Haiku 5.5 est facturé au tarif « long contexte » : on compte large
  const long = inputTokens > 100_000;
  const coutUsd = (inputTokens * (long ? 0.5 : PRIX_ENTREE) + outputTokens * (long ? 2.5 : PRIX_SORTIE)) / 1e6 + recherches * PRIX_RECHERCHE;
  const brut = ((outil?.input ?? {}) as { lignes?: LigneIA[]; evenements?: unknown; remarques?: string });
  const n = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < 30 ? (v as number) : 0);
  const lignes = (brut.lignes ?? []).filter((l) => l && (l.equipe === "home" || l.equipe === "away")).map((l) => ({
    equipe: l.equipe, ref: typeof l.ref === "string" ? l.ref : null, nom_lu: String(l.nom_lu ?? "").slice(0, 80),
    essais: n(l.essais), transformations: n(l.transformations), penalites: n(l.penalites), drops: n(l.drops),
    cartons_jaunes: n(l.cartons_jaunes), cartons_rouges: n(l.cartons_rouges),
  }));
  const remarques = outil ? String(brut.remarques ?? "").slice(0, 600) : "Claude n'a pas trouvé de compte rendu exploitable.";
  return { lignes, evenements: filPropre(brut.evenements), remarques, inputTokens, outputTokens, coutUsd, recherches };
}

// ---------- rédaction libre (légendes de posts) ----------
export type TexteIA = { texte: string; inputTokens: number; outputTokens: number; coutUsd: number };

/** Texte court rédigé par Claude (Haiku) à partir de faits fournis : rien n'est inventé au-delà. */
export async function rediger(opts: { systeme: string; consigne: string; maxTokens?: number }): Promise<TexteIA> {
  const cle = process.env.ANTHROPIC_API_KEY;
  if (!cle) throw new Error("La clé ANTHROPIC_API_KEY n'est pas encore configurée sur Vercel.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": cle, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: IA_MODELE, max_tokens: opts.maxTokens ?? 700, system: opts.systeme, messages: [{ role: "user", content: opts.consigne }] }),
    signal: AbortSignal.timeout(45_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) throw new Error("Clé Claude refusée : vérifiez ANTHROPIC_API_KEY sur Vercel.");
    if (res.status === 429 || res.status === 529) throw new Error("Claude est très sollicité, réessayez dans une minute.");
    throw new Error(`Claude : ${body?.error?.message ?? `HTTP ${res.status}`}`);
  }
  const texte = (body?.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n").trim();
  const inputTokens = body?.usage?.input_tokens ?? 0, outputTokens = body?.usage?.output_tokens ?? 0;
  return { texte, inputTokens, outputTokens, coutUsd: (inputTokens * PRIX_ENTREE + outputTokens * PRIX_SORTIE) / 1e6 };
}

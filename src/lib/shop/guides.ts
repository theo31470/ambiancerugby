/**
 * Guides des tailles et fiches pratiques par type d'article.
 * Mesures à plat en centimètres, d'après les fabricants des modèles utilisés chez Printful (à ±2 cm près).
 */
export type Guide = { titre: string; conseil: string; colonnes: string[]; lignes: [string, ...string[]][] };

export const GUIDES: Record<string, Guide> = {
  tshirt: {
    titre: "T-shirt unisexe",
    conseil: "Coupe unisexe droite. Entre deux tailles, prenez la plus grande pour un tombé décontracté.",
    colonnes: ["Taille", "Largeur poitrine", "Longueur"],
    lignes: [["S", "46", "71"], ["M", "51", "74"], ["L", "56", "76"], ["XL", "61", "79"], ["2XL", "66", "81"], ["3XL", "71", "84"]],
  },
  sweat: {
    titre: "Sweat unisexe",
    conseil: "Coupe ample et confortable. Prenez votre taille habituelle, ou une en dessous pour un sweat plus ajusté.",
    colonnes: ["Taille", "Largeur poitrine", "Longueur"],
    lignes: [["S", "51", "69"], ["M", "56", "71"], ["L", "61", "74"], ["XL", "66", "76"], ["2XL", "71", "79"], ["3XL", "76", "81"]],
  },
};

/** Guide d'un produit : choisi dans le studio, sinon deviné d'après son nom. « aucun » le masque. */
export function guideDe(p: { name: string; category: string; guide_tailles: string | null }): Guide | null {
  if (p.guide_tailles === "aucun") return null;
  if (p.guide_tailles && GUIDES[p.guide_tailles]) return GUIDES[p.guide_tailles];
  if (p.category !== "vetements") return null;
  if (/sweat|hoodie|capuche/i.test(p.name)) return GUIDES.sweat;
  if (/t-?shirt|tee/i.test(p.name)) return GUIDES.tshirt;
  return null;
}

/** Composition et entretien par défaut, quand la fiche n'en précise pas. */
export function detailsDe(p: { name: string; category: string; details: string | null }): string {
  if (p.details?.trim()) return p.details.trim();
  const n = p.name.toLowerCase();
  if (/poster|affiche/.test(n)) return "Impression sur papier mat épais, aux couleurs profondes.\nLivré roulé dans un tube de protection, sans cadre.";
  if (/mug|tasse/.test(n)) return "Céramique blanche brillante.\nPasse au lave-vaisselle et au micro-ondes.";
  if (/tapis de souris/.test(n)) return "Dessus en tissu doux pour une glisse précise, dessous en caoutchouc antidérapant.\nNettoyage à l'eau tiède savonneuse.";
  if (/autocollant|sticker/.test(n)) return "Vinyle résistant à l'eau et aux rayures, découpé à la forme.\nÀ coller sur une surface propre et sèche.";
  if (/casquette/.test(n)) return "Broderie en relief. Réglable à l'arrière.\nNettoyage à la main, à l'eau froide.";
  if (p.category === "vetements") return "Fabriqué à la demande pour vous, sans stock ni gaspillage.\nLavage à 30 °C sur l'envers, pas de sèche-linge, repassage sur l'envers sans toucher l'impression.";
  return "Fabriqué à la demande pour vous, sans stock ni gaspillage.";
}

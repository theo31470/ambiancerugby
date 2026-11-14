import type { Commande } from "./admin";

export const MOTIFS_SAV = {
  retractation: { titre: "Je change d'avis", detail: "Retour sous 14 jours après réception, remboursé à réception de l'article. Frais de retour à votre charge.", photos: false },
  defaut: { titre: "Article abîmé ou mal imprimé", detail: "Remplacé ou remboursé sans frais. Joignez une photo du défaut.", photos: true },
  erreur: { titre: "Mauvais article ou mauvaise taille reçue", detail: "Une erreur de notre part : remplacé sans frais. Joignez une photo de l'article et de l'étiquette.", photos: true },
  non_recu: { titre: "Colis pas reçu", detail: "Le suivi ne bouge plus ou le colis est marqué livré sans être arrivé : on enquête avec le transporteur.", photos: false },
  autre: { titre: "Autre question", detail: "Changer l'adresse, annuler avant l'expédition, une question sur la facture…", photos: false },
} as const;
export type MotifSav = keyof typeof MOTIFS_SAV;
export const STATUTS_SAV: Record<string, string> = { ouverte: "Reçue", en_cours: "En cours de traitement", acceptee: "Acceptée", refusee: "Refusée", cloturee: "Terminée" };
export const SOUHAITS: Record<string, string> = { remboursement: "Être remboursé", remplacement: "Recevoir le même article", echange: "Échanger (autre taille ou couleur)", autre: "Autre" };

const JOUR = 86400e3;

/** Motifs possibles pour une commande, selon son avancement (délai légal de 14 jours après réception pour la rétractation). */
export function motifsPossibles(c: Pick<Commande, "statut" | "expedie_at" | "livre_at">, maintenant = Date.now()): MotifSav[] {
  if (["en_attente", "annulee", "remboursee"].includes(c.statut)) return ["autre"];
  const recu = c.livre_at ? new Date(c.livre_at).getTime() : c.expedie_at ? new Date(c.expedie_at).getTime() + 7 * JOUR : null;
  const out: MotifSav[] = [];
  // avant réception, la rétractation reste possible (le délai de 14 jours ne court qu'à partir de la livraison)
  if (!recu || maintenant <= recu + 14 * JOUR) out.push("retractation");
  if (recu && maintenant <= recu + 60 * JOUR) out.push("defaut", "erreur");
  if (c.expedie_at && maintenant >= new Date(c.expedie_at).getTime() + 8 * JOUR && c.statut !== "livree") out.push("non_recu");
  out.push("autre");
  return out;
}

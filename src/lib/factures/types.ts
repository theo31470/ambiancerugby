/** Factures et avoirs émis par Ambiance Rugby (abonnement Supporter et boutique). */

export type TypeDocument = "facture" | "avoir";

export type Client = { nom: string; email: string; ligne1?: string | null; ligne2?: string | null; cp?: string | null; ville?: string | null; pays?: string | null };

export type LigneDoc = {
  label: string;
  /** Précision sous l'intitulé : période, couleur et taille… */
  detail?: string | null;
  quantite: number;
  unite_cents: number;
  /** Peut être négatif : remise. */
  total_cents: number;
};

export type Vendeur = { nom: string; adresse: string; siret: string; email: string; mention_tva: string };

export type DocumentFacture = {
  type: TypeDocument;
  numero: string;
  emis_le: string;
  /** Date de paiement (facture) ou de remboursement (avoir). */
  regle_le: string | null;
  client: Client;
  lignes: LigneDoc[];
  total_cents: number;
  /** « Visa •••• 4242 », « PayPal »… */
  moyen?: string | null;
  /** Avoir : numéro de la facture remboursée et motif. */
  facture_origine?: string | null;
  motif?: string | null;
  /** Période couverte (abonnement), affichée dans l'en-tête. */
  periode?: string | null;
  mode_test?: boolean;
};

export const PAYS: Record<string, string> = {
  FR: "France", BE: "Belgique", CH: "Suisse", LU: "Luxembourg", MC: "Monaco", ES: "Espagne", IT: "Italie", DE: "Allemagne", GB: "Royaume-Uni", IE: "Irlande", PT: "Portugal", NL: "Pays-Bas",
};

/** « 1 234,50 € » */
export function montant(cents: number) {
  const neg = cents < 0;
  const [e, d] = (Math.abs(cents) / 100).toFixed(2).split(".");
  return `${neg ? "-" : ""}${e.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${d} €`;
}

/** « 11 novembre 2026 », heure de Paris. */
export function dateLongue(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }) : "";
}
export function dateCourte(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" }) : "";
}

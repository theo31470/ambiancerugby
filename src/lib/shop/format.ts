export const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export const PAYS: Record<string, string> = {
  FR: "France", BE: "Belgique", CH: "Suisse", LU: "Luxembourg", MC: "Monaco", ES: "Espagne", IT: "Italie", DE: "Allemagne",
  PT: "Portugal", NL: "Pays-Bas", IE: "Irlande", GB: "Royaume-Uni", AT: "Autriche", DK: "Danemark", SE: "Suède", CA: "Canada",
};

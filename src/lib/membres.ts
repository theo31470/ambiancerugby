/** Ce que le membre est dans le rugby (affiché sur son profil public). */
export const JE_SUIS = { supporter: "Supporter", joueur: "Joueur ou joueuse", entraineur: "Éducateur, entraîneur", arbitre: "Arbitre", benevole: "Bénévole de club", parent: "Parent de joueur", journaliste: "Journaliste, blogueur" } as const;

export type Prefs = { theme?: "auto" | "clair" | "sombre"; email_actus?: boolean; email_alertes?: boolean; email_boutique?: boolean; alertes_essais?: boolean; alertes_debut?: boolean; alertes_resultat?: boolean; celebrations?: boolean; alertes_cartons?: boolean; alertes_joueurs?: boolean; alertes_serre?: boolean; alertes_simulateur?: boolean; couleurs_club?: boolean };
/** Préférences par défaut d'un nouveau membre. */
export const PREFS_DEFAUT: Required<Prefs> = { theme: "auto", email_actus: false, email_alertes: true, email_boutique: true, alertes_essais: true, alertes_debut: true, alertes_resultat: true, celebrations: true, alertes_cartons: false, alertes_joueurs: true, alertes_serre: true, alertes_simulateur: true, couleurs_club: false };

/** Les grades du badge Supporter : ils montent avec l'ancienneté et les matchs suivis en tribune. */
export const GRADES = ["Supporter", "Abonné de tribune", "Pilier de buvette", "Légende du virage"] as const;
export const gradeDe = (g: number | null | undefined) => GRADES[Math.max(0, Math.min(3, g ?? 0))];
/** Prochain palier, pour l'afficher au membre. */
export const PALIERS = [
  { mois: 3, matchs: 10 }, { mois: 12, matchs: 40 }, { mois: 24, matchs: 100 },
] as const;

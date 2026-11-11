/** Ce que le membre est dans le rugby (affiché sur son profil public). */
export const JE_SUIS = { supporter: "Supporter", joueur: "Joueur ou joueuse", entraineur: "Éducateur, entraîneur", arbitre: "Arbitre", benevole: "Bénévole de club", parent: "Parent de joueur", journaliste: "Journaliste, blogueur" } as const;

export type Prefs = { theme?: "auto" | "clair" | "sombre"; email_actus?: boolean; email_alertes?: boolean; email_boutique?: boolean; alertes_essais?: boolean; alertes_debut?: boolean; alertes_resultat?: boolean; celebrations?: boolean };
/** Préférences par défaut d'un nouveau membre. */
export const PREFS_DEFAUT: Required<Prefs> = { theme: "auto", email_actus: false, email_alertes: true, email_boutique: true, alertes_essais: true, alertes_debut: true, alertes_resultat: true, celebrations: true };

/** Constantes du XV de la semaine, partagées avec le navigateur. */
export type Candidat = { id: string; slug: string; nom: string; photo: string | null; club: string | null; note: number | null; numero: number };

export const POSTES_XV: Record<number, string> = {
  1: "Pilier G.", 2: "Talonneur", 3: "Pilier D.", 4: "2e ligne", 5: "2e ligne", 6: "Flanker", 7: "Flanker", 8: "N° 8",
  9: "Demi de mêlée", 10: "Ouvreur", 11: "Ailier", 12: "Centre", 13: "Centre", 14: "Ailier", 15: "Arrière",
};
/** Lignes du terrain, des avants (en haut) aux arrières. */
export const LIGNES_XV = [[1, 2, 3], [4, 5], [6, 8, 7], [9, 10], [12, 13], [11, 15, 14]];

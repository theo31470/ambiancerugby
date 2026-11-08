import { Coupe, Echarpe, Journal, Maillot, Podium, Sifflet } from "../deco/Icones";

export const LIENS = [
  { href: "/matchs", label: "Matchs", detail: "Scores en direct et calendrier", Icone: Sifflet },
  { href: "/indice", label: "Indice Ambiance", court: "Indice", detail: "Notre classement de puissance", Icone: Podium },
  { href: "/competitions", label: "Compétitions", detail: "Classements et résultats", Icone: Coupe },
  { href: "/clubs", label: "Clubs", detail: "Fiches, forme et effectifs", Icone: Echarpe },
  { href: "/joueurs", label: "Joueurs", detail: "Stats et notes sur 10", Icone: Maillot },
  { href: "/actus", label: "Actus", detail: "Analyses, transferts, avant-matchs", Icone: Journal },
];

/**
 * Phrases de commentateur pour le fil du match. {j} = joueur, {e} = équipe.
 * Le choix dépend de l'identifiant de l'action : même phrase à chaque affichage, mais variée d'une action à l'autre.
 */
const PHRASES: Record<string, string[]> = {
  try: [
    "ESSAI ! {j} aplatit et le stade explose !",
    "{j} file dans l'en-but, rien à faire pour la défense !",
    "Quelle percée ! {j} va au bout et {e} fait trembler les filets… enfin, la ligne !",
    "Ballon écrasé derrière la ligne : {j} signe un essai plein d'autorité.",
    "C'est l'essai ! {j} ne laisse aucune chance, les tribunes chavirent.",
    "La meute a poussé, {j} conclut. Essai {e} !",
    "Coup de rein, coup de génie : {j} marque !",
    "{j} a senti le coup, {j} est récompensé. Cinq points pour {e} !",
  ],
  penalty_try: [
    "Essai de pénalité ! L'arbitre fonce sous les poteaux, sept points pour {e}.",
    "Faute grossière sur l'action d'essai : essai de pénalité accordé à {e} !",
  ],
  conversion: [
    "{j} transforme, tranquille.",
    "Entre les perches ! {j} ajoute les deux points.",
    "Coup de pied parfait de {j}, la transformation passe.",
    "{j} ne tremble pas : transformation réussie.",
    "Deux points de plus pour {e}, signé {j}.",
  ],
  penalty: [
    "Pénalité réussie par {j}, trois points dans la musette.",
    "{j} punit la faute : la pénalité passe.",
    "Le buteur de {e} ne pardonne pas : {j} enquille.",
    "Sang-froid total de {j}, les poteaux sont trop gentils.",
    "{e} prend les points : {j} est en mode métronome.",
  ],
  drop: [
    "DROP ! {j} sort la patte et les trois points avec !",
    "Coup de pied tombé de {j} : magnifique drop !",
    "{j} tente le drop… et ça passe ! Quel culot !",
  ],
  yellow: [
    "Carton jaune pour {j}. Dix minutes de réflexion sur le banc.",
    "L'arbitre sort le jaune : {j} file au frigo.",
    "{j} prend un carton jaune, {e} à quatorze pour un moment.",
    "Jaune pour {j} : ça chauffe sur la pelouse !",
  ],
  red: [
    "ROUGE ! {j} est exclu, coup dur pour {e} !",
    "L'arbitre ne discute pas : carton rouge pour {j}.",
    "Soirée terminée pour {j}, exclu définitivement.",
  ],
  sub: [
    "Changement côté {e}.",
    "{e} fait tourner pour garder du jus.",
    "Du sang neuf pour {e}.",
  ],
};

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function phraseAction(kind: string, id: string, joueur: string | null, equipe: string) {
  const liste = PHRASES[kind];
  if (!liste?.length) return null;
  const sansJoueur = liste.filter((p) => !p.includes("{j}"));
  const choix = joueur ? liste : sansJoueur.length ? sansJoueur : null;
  if (!choix) return null;
  return choix[hash(id) % choix.length].replaceAll("{j}", joueur ?? "").replaceAll("{e}", equipe);
}

import { estClair } from "./couleurs";

/**
 * Première collection Ambiance Rugby : visuels originaux (dossier public/merch) posés sur des modèles Printful.
 * Chaque modèle est retrouvé dans le catalogue Printful par son nom, couleurs et tailles comprises.
 */
export type Article = {
  nom: string;
  description: string;
  categorie: "vetements" | "accessoires" | "maison" | "goodies";
  modele: RegExp;          // titre du modèle dans le catalogue Printful
  emplacement: string;     // type de fichier Printful : front, default…
  prix: string;            // prix de vente TTC en euros
  tailles?: string[];      // tailles retenues (toutes si absent)
  visuels: { fonce: string; clair: string }; // visuel posé sur un modèle foncé / sur un modèle clair
};

/** Visuel à imprimer selon la teinte du modèle (code couleur Printful). */
export const visuelPour = (a: Article, hex: string | null | undefined) => (estClair(hex) ? a.visuels.clair : a.visuels.fonce);


export const COLLECTION: Article[] = [
  {
    nom: "T-shirt Ambiance Rugby",
    description: "Le logo ballon d'Ambiance Rugby en grand sur la poitrine. Coton doux, coupe unisexe, pour la tribune comme pour la troisième mi-temps.",
    categorie: "vetements", modele: /Bella \+ Canvas 3001\b/i, emplacement: "front", prix: "29.00",
    visuels: { fonce: "logo-xl-blanc", clair: "logo-xl-vin" },
  },
  {
    nom: "T-shirt Troisième mi-temps",
    description: "Pour ceux qui savent que le match ne s'arrête pas au coup de sifflet final. Lettrage groovy, coton doux, coupe unisexe.",
    categorie: "vetements", modele: /Bella \+ Canvas 3001\b/i, emplacement: "front", prix: "32.00",
    visuels: { fonce: "troisieme-mi-temps-fonce", clair: "troisieme-mi-temps-clair" },
  },
  {
    nom: "Sweat à capuche Allez les gars",
    description: "Le cri de toutes les tribunes, imprimé sur un sweat à capuche bien chaud. Poche kangourou, coupe unisexe.",
    categorie: "vetements", modele: /Gildan 18500\b/i, emplacement: "front", prix: "55.00",
    visuels: { fonce: "allez-les-gars-fonce", clair: "allez-les-gars-clair" },
  },
  {
    nom: "Mug Troisième mi-temps",
    description: "Pour le café d'avant-match ou la tisane d'après. Mug en céramique blanc brillant, 33 cl, compatible lave-vaisselle.",
    categorie: "maison", modele: /White Glossy Mug/i, emplacement: "default", prix: "16.00", tailles: ["11 oz"],
    visuels: { fonce: "mug-troisieme-mi-temps", clair: "mug-troisieme-mi-temps" },
  },
  {
    nom: "Autocollant Ambiance Rugby",
    description: "L'écusson Ambiance Rugby à coller sur l'ordi, la gourde ou la glacière. Vinyle découpé, résistant à l'eau.",
    categorie: "goodies", modele: /Kiss-Cut Stickers/i, emplacement: "default", prix: "4.00", tailles: ["4″×4″", "4\"×4\"", "4×4"],
    visuels: { fonce: "sticker-rond", clair: "sticker-rond" },
  },
];

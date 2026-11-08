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
  visuels: Record<string, string>; // couleur du modèle -> fichier du visuel ; « * » = toutes les couleurs
};

const TAILLES = ["S", "M", "L", "XL", "2XL"];

export const COLLECTION: Article[] = [
  {
    nom: "T-shirt Ambiance Rugby",
    description: "Le logo ballon d'Ambiance Rugby en grand sur la poitrine. Coton doux, coupe unisexe, pour la tribune comme pour la troisième mi-temps.",
    categorie: "vetements", modele: /Bella \+ Canvas 3001\b/i, emplacement: "front", prix: "29.00", tailles: TAILLES,
    visuels: { Black: "logo-xl-blanc", Maroon: "logo-xl-blanc", White: "logo-xl-vin" },
  },
  {
    nom: "T-shirt Troisième mi-temps",
    description: "Pour ceux qui savent que le match ne s'arrête pas au coup de sifflet final. Lettrage groovy, coton doux, coupe unisexe.",
    categorie: "vetements", modele: /Bella \+ Canvas 3001\b/i, emplacement: "front", prix: "32.00", tailles: TAILLES,
    visuels: { Black: "troisieme-mi-temps-fonce", Maroon: "troisieme-mi-temps-fonce", White: "troisieme-mi-temps-clair" },
  },
  {
    nom: "Sweat à capuche Allez les gars",
    description: "Le cri de toutes les tribunes, imprimé sur un sweat à capuche bien chaud. Poche kangourou, coupe unisexe.",
    categorie: "vetements", modele: /Gildan 18500\b/i, emplacement: "front", prix: "55.00", tailles: TAILLES,
    visuels: { Black: "allez-les-gars-fonce", Maroon: "allez-les-gars-fonce", White: "allez-les-gars-clair" },
  },
  {
    nom: "Mug Troisième mi-temps",
    description: "Pour le café d'avant-match ou la tisane d'après. Mug en céramique blanc brillant, 33 cl, compatible lave-vaisselle.",
    categorie: "maison", modele: /White Glossy Mug/i, emplacement: "default", prix: "16.00", tailles: ["11 oz"],
    visuels: { "*": "mug-troisieme-mi-temps" },
  },
  {
    nom: "Autocollant Ambiance Rugby",
    description: "L'écusson Ambiance Rugby à coller sur l'ordi, la gourde ou la glacière. Vinyle découpé, résistant à l'eau.",
    categorie: "goodies", modele: /Kiss-Cut Stickers/i, emplacement: "default", prix: "4.00", tailles: ["4″×4″", "4\"×4\"", "4×4"],
    visuels: { "*": "sticker-rond" },
  },
];

/**
 * Couleurs des déclinaisons. color_hex vient du catalogue Printful : « #000000 », ou « #000000,#ffffff »
 * pour une casquette bicolore (couleur principale, puis seconde couleur).
 */
export const teintes = (hex: string | null | undefined) =>
  (hex ?? "").split(",").map((x) => x.trim()).filter((x) => /^#[0-9a-f]{6}$/i.test(x));

/** Fond CSS d'une pastille de couleur : uni, ou coupé en deux pour les bicolores. */
export function fondPastille(hex: string | null | undefined) {
  const [a, b] = teintes(hex);
  if (!a) return "#cfc6bd";
  return b ? `linear-gradient(135deg, ${a} 50%, ${b} 50%)` : a;
}

/** Luminance relative (0 = noir, 1 = blanc) de la couleur principale. */
export function luminance(hex: string | null | undefined) {
  const [a] = teintes(hex);
  if (!a) return 0.5;
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(a.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Vêtement clair (on y pose le visuel foncé) ou foncé (visuel clair). */
export const estClair = (hex: string | null | undefined) => luminance(hex) > 0.4;

export const ORDRE_TAILLES = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "4XL", "5XL", "6XL"];
export const rangTaille = (t: string | null) => { const i = ORDRE_TAILLES.indexOf((t ?? "").toUpperCase()); return i < 0 ? 99 : i; };

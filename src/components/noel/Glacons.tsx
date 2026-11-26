/** Quelques grappes de stalactites sous un bandeau (dessinées une fois, mêmes positions à chaque visite). */
function dessin() {
  let s = 11;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const W = 1600;
  const d: string[] = [];
  for (let x = 60 + r() * 80; x < W - 40; x += 120 + r() * 190) {
    const nb = 2 + Math.floor(r() * 3);
    for (let j = 0; j < nb; j++) {
      const xx = x + j * (6 + r() * 6), L = 6 + r() * 15, l = 1.6 + r() * 2;
      d.push(`<path d="M${xx - l} 0 C${xx - l * 0.6} ${L * 0.45} ${xx - 0.4} ${L * 0.8} ${xx} ${L} C${xx + 0.4} ${L * 0.8} ${xx + l * 0.6} ${L * 0.45} ${xx + l} 0Z" fill="url(#noel-glace)"/><path d="M${xx - l * 0.35} 1 L${xx - 0.2} ${L * 0.7}" stroke="#fff" stroke-width=".6" opacity=".8"/>`);
    }
  }
  return d.join("");
}
const DESSIN = dessin();

export default function Glacons({ className = "" }: { className?: string }) {
  return <svg className={`pointer-events-none ${className}`} viewBox="0 0 1600 22" preserveAspectRatio="xMidYMin slice" aria-hidden dangerouslySetInnerHTML={{ __html: DESSIN }} />;
}

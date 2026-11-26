/** Les bonshommes de neige supporters : écharpe aux couleurs du site, ballon de rugby jamais loin. */

type P = { className?: string };

/** Corps de base : deux boules ombrées, visage, écharpe. Origine au centre de la tête. */
function Corps({ tete = 14, corps = 20, bonnet = "laine" }: { tete?: number; corps?: number; bonnet?: "laine" | "noel" }) {
  const yc = tete + corps - 4;
  return (
    <>
      <circle cy={yc} r={corps} fill="url(#noel-boule)" />
      <circle r={tete} fill="url(#noel-boule)" />
      <use href="#noel-visage" transform={`scale(${tete / 14})`} />
      <use href="#noel-echarpe" transform={`translate(0 ${tete - 2}) scale(${tete / 14})`} />
      {bonnet === "laine"
        ? <use href="#noel-bonnet-laine" transform={`translate(0 ${-tete + 4}) scale(${tete / 14})`} />
        : <use href="#noel-bonnet" transform={`translate(${-tete - 1} ${-tete - 24 * (tete / 14)}) scale(${0.45 * (tete / 14)})`} />}
    </>
  );
}

/** Il passe la tête au-dessus d'un bord et fait coucou (à placer dans un parent en overflow-hidden). */
export function BonhommeCoucou({ className = "" }: P) {
  return (
    <svg className={`noel-coucou ${className}`} width="70" height="86" viewBox="-35 -40 70 86" aria-hidden>
      <Corps />
      <g className="noel-bras" transform="translate(16 18)"><path d="M0 0 L14 -16 M9 -10 L15 -10 M9 -10 L10 -16" stroke="#6b4226" strokeWidth="2.4" strokeLinecap="round" fill="none" /></g>
    </svg>
  );
}

/** Assis sur le rebord d'une carte, ballon sous le bras, il hoche la tête. */
export function BonhommeAssis({ className = "" }: P) {
  return (
    <svg className={className} width="64" height="76" viewBox="-32 -52 64 76" aria-hidden>
      <circle cy="8" r="19" fill="url(#noel-boule)" />
      <g className="noel-hoche">
        <circle cy="-20" r="13" fill="url(#noel-boule)" />
        <use href="#noel-visage" transform="translate(0 -20) scale(.9)" />
        <use href="#noel-bonnet" transform="translate(-14 -44) scale(.42)" />
      </g>
      <use href="#noel-echarpe" transform="translate(0 -8) scale(.95)" />
      <g transform="translate(-16 10) rotate(-25)"><use href="#noel-ballon" /></g>
      <path d="M-12 2 L-24 -6" stroke="#6b4226" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Deux bonshommes qui se font des passes, pour le bas du pied de page. */
export function Passeurs({ className = "" }: P) {
  return (
    <svg className={className} width="300" height="110" viewBox="0 0 300 110" aria-hidden>
      <g transform="translate(40 54) scale(.86)"><Corps tete={14} corps={20} /><path d="M15 20 L28 8" stroke="#6b4226" strokeWidth="2.4" strokeLinecap="round" /></g>
      <g transform="translate(260 54) scale(-.86 .86)"><Corps tete={14} corps={20} bonnet="noel" /><path d="M15 20 L28 8" stroke="#6b4226" strokeWidth="2.4" strokeLinecap="round" /></g>
      <g className="noel-passe"><g transform="rotate(-20)"><use href="#noel-ballon" /></g></g>
    </svg>
  );
}

/** Le petit bonhomme du bas du menu du studio. */
export function BonhommeMenu({ className = "" }: P) {
  return (
    <svg className={className} width="60" height="70" viewBox="-30 -28 60 70" aria-hidden>
      <g transform="scale(.8)"><Corps /></g>
      <g transform="translate(15 22) rotate(30)"><use href="#noel-ballon" /></g>
    </svg>
  );
}

/** Le buteur seul (le tir est géré par <SceneNoel>). */
export function Buteur() {
  return (
    <svg width="90" height="96" viewBox="-40 -30 90 96" aria-hidden>
      <ellipse cx="2" cy="63" rx="30" ry="4" fill="#3e162114" />
      <Corps />
      <path d="M-16 36 L-30 24" stroke="#6b4226" strokeWidth="2.4" strokeLinecap="round" />
      <g className="noel-jambe"><path d="M12 52 L24 60" stroke="#6b4226" strokeWidth="3" strokeLinecap="round" /></g>
    </svg>
  );
}

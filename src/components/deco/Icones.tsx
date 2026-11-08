// Illustrations maison de l'univers rugby (traits épais, style années 70 comme le logo).
type P = { className?: string; title?: string };

const svg = (title?: string) => (title ? { role: "img", "aria-label": title } : { "aria-hidden": true as const });

/**
 * Ballon de rugby : corps blanc, plus rond qu'un ballon de football américain, coutures
 * des panneaux d'une pointe à l'autre et bandes imprimées, sans lacets.
 * La couleur du texte (currentColor) donne le contour et l'impression.
 */
export function Ballon({ className, title }: P) {
  return (
    <svg viewBox="0 0 64 44" className={className} {...svg(title)}>
      <g transform="rotate(-8 32 22)">
        <ellipse cx="32" cy="22" rx="29" ry="18.5" fill="var(--ballon, #fff)" stroke="currentColor" strokeWidth="2.6" />
        {/* coutures des quatre panneaux */}
        <path d="M3.5 22C14 12.5 50 12.5 60.5 22" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".55" />
        <path d="M3.5 22C14 31.5 50 31.5 60.5 22" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".55" />
        {/* bandes imprimées près des pointes */}
        <path d="M14 7.6c-3 4.3-3 24.5 0 28.8" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M19 5.4c-2.4 5-2.4 28.2 0 33.2" fill="none" stroke="var(--deco-accent2, #934f5e)" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M50 7.6c3 4.3 3 24.5 0 28.8" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
        {/* logo central */}
        <ellipse cx="32" cy="22" rx="6.5" ry="4.2" fill="currentColor" opacity=".9" />
      </g>
    </svg>
  );
}

export function Pinte({ className, title }: P) {
  return (
    <svg viewBox="0 0 40 56" className={className} {...svg(title)}>
      <path d="M6 10h24l-3 42a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3z" fill="#f2b53a" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M30 18h4a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-5" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M4 12c0-5 4-8 8-7 2-4 9-4 11 0 4-1 9 1 9 6 0 3-2 5-4 5H8c-2 0-4-2-4-4z" fill="#fff" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="15" cy="30" r="1.6" fill="#fff" opacity=".8" /><circle cx="20" cy="40" r="1.2" fill="#fff" opacity=".8" /><circle cx="22" cy="26" r="1" fill="#fff" opacity=".8" />
    </svg>
  );
}

export function Poteaux({ className, title }: P) {
  return (
    <svg viewBox="0 0 48 56" className={className} {...svg(title)}>
      <path d="M10 2v52M38 2v52M10 26h28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M8 44h4M36 44h4" stroke="var(--deco-accent, #f2b53a)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function Echarpe({ className, title }: P) {
  return (
    <svg viewBox="0 0 56 56" className={className} {...svg(title)}>
      <path d="M6 16c12-6 32-6 44 0l-4 10c-10-4-26-4-36 0z" fill="currentColor" />
      <path d="M14 22l-4 30 8-2 2-26M42 22l4 30-8-2-2-26" fill="currentColor" />
      <path d="M11 34l7-1M10 42l7-1M45 34l-7-1M46 42l-7-1M18 14v8M28 12v8M38 14v8" stroke="#f2b53a" strokeWidth="3" />
      <path d="M10 52l-1 3M14 51l-1 3M42 51l1 3M46 52l1 3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function Trompette({ className, title }: P) {
  return (
    <svg viewBox="0 0 64 36" className={className} {...svg(title)}>
      <path d="M4 15h34l18-11v28L38 21H4z" fill="#f2b53a" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="14" y="8" width="4" height="7" rx="1" fill="currentColor" /><rect x="21" y="8" width="4" height="7" rx="1" fill="currentColor" /><rect x="28" y="8" width="4" height="7" rx="1" fill="currentColor" />
      <path d="M12 21c0 8 22 8 22 0" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

export function Beret({ className, title }: P) {
  return (
    <svg viewBox="0 0 60 36" className={className} {...svg(title)}>
      <path d="M4 22c0-10 12-16 26-16s26 6 26 16c0 5-10 8-26 8S4 27 4 22z" fill="currentColor" />
      <path d="M29 6c0-2 1-4 3-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M10 27c8 3 32 3 40 0" stroke="#f2b53a" strokeWidth="2.5" fill="none" />
    </svg>
  );
}

/** Supporter stylisé (bras levés), pour la ola. */
export function Supporter({ className, couleur = "currentColor" }: P & { couleur?: string }) {
  return (
    <svg viewBox="0 0 24 40" className={className} aria-hidden>
      <circle cx="12" cy="7" r="5" fill={couleur} />
      <path d="M4 40V22a8 8 0 0 1 16 0v18z" fill={couleur} />
      <path d="M5 21L1 6M19 21l4-15" stroke={couleur} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}


export function Sifflet({ className, title }: P) {
  return (
    <svg viewBox="0 0 56 40" className={className} {...svg(title)}>
      <path d="M20 12h30a4 4 0 0 1 4 4v4H34a14 14 0 1 1-14-8z" fill="currentColor" />
      <circle cx="20" cy="26" r="6" fill="var(--deco-trait, #fff)" opacity=".5" />
      <rect x="40" y="8" width="6" height="6" rx="1" fill="currentColor" />
      <path d="M8 14C5 10 4 6 6 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Podium({ className, title }: P) {
  return (
    <svg viewBox="0 0 56 44" className={className} {...svg(title)}>
      <rect x="20" y="10" width="16" height="32" rx="2" fill="currentColor" />
      <rect x="3" y="20" width="16" height="22" rx="2" fill="currentColor" opacity=".7" />
      <rect x="37" y="26" width="16" height="16" rx="2" fill="currentColor" opacity=".5" />
      <path d="M28 1l2 4 4.5.6-3.3 3 .8 4.4L28 11l-4 2 .8-4.4-3.3-3L26 5z" fill="#f2b53a" />
    </svg>
  );
}

export function Coupe({ className, title }: P) {
  return (
    <svg viewBox="0 0 48 52" className={className} {...svg(title)}>
      <path d="M12 4h24v12a12 12 0 0 1-24 0z" fill="currentColor" />
      <path d="M12 8H5a3 3 0 0 0-3 3c0 6 4 10 10 10M36 8h7a3 3 0 0 1 3 3c0 6-4 10-10 10" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M21 28h6v10h-6z" fill="currentColor" />
      <rect x="13" y="38" width="22" height="7" rx="2" fill="currentColor" />
      <path d="M17 10v6" stroke="#f2b53a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Maillot({ className, title, numero }: P & { numero?: number | string }) {
  return (
    <svg viewBox="0 0 56 52" className={className} {...svg(title)}>
      <path d="M18 3l-14 8 5 12 7-3v29h24V20l7 3 5-12-14-8c-2 4-5 6-10 6S20 7 18 3z" fill="currentColor" />
      <path d="M16 26h24" stroke="#f2b53a" strokeWidth="4" />
      {numero != null && <text x="28" y="44" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" fontFamily="var(--font-titre)">{numero}</text>}
    </svg>
  );
}

export function Journal({ className, title }: P) {
  return (
    <svg viewBox="0 0 56 44" className={className} {...svg(title)}>
      <path d="M8 4h38v32a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" fill="currentColor" />
      <path d="M46 12h4a2 2 0 0 1 2 2v22a4 4 0 0 1-4 4h-6" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="10" y="10" width="14" height="10" rx="1" fill="#f2b53a" />
      <path d="M28 12h12M28 18h12M10 26h30M10 32h22" stroke="var(--deco-trait, #fff)" strokeWidth="2.5" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

export const ICONES = [Ballon, Pinte, Poteaux, Echarpe, Trompette, Beret];

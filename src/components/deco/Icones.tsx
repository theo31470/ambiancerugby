// Illustrations maison de l'univers rugby (traits épais, style années 70 comme le logo).
type P = { className?: string; title?: string };

const svg = (title?: string) => (title ? { role: "img", "aria-label": title } : { "aria-hidden": true as const });

export function Ballon({ className, title }: P) {
  return (
    <svg viewBox="0 0 64 40" className={className} {...svg(title)}>
      <ellipse cx="32" cy="20" rx="29" ry="17" fill="currentColor" />
      <path d="M8 13c8 3 40 3 48 0M8 27c8-3 40-3 48 0" stroke="var(--deco-trait, #fff)" strokeWidth="2" fill="none" opacity=".55" />
      <path d="M22 20h20" stroke="var(--deco-trait, #fff)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M25 17v6M29 17v6M33 17v6M37 17v6" stroke="var(--deco-trait, #fff)" strokeWidth="2" strokeLinecap="round" />
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
      <path d="M8 44h4M36 44h4" stroke="#f2b53a" strokeWidth="6" strokeLinecap="round" />
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

export const ICONES = [Ballon, Pinte, Poteaux, Echarpe, Trompette, Beret];

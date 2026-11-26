import { FACEBOOK, INSTAGRAM } from "@/lib/reseaux";

const IconeInsta = (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const IconeFb = (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
    <path d="M13.5 21v-7.6h2.6l.4-3H13.5V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21z" />
  </svg>
);

/** Boutons vers les réseaux. `clair` = sur fond bordeaux, sinon sur fond clair. */
export default function Reseaux({ clair = false, className = "" }: { clair?: boolean; className?: string }) {
  const base = "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors";
  const ton = clair ? "bg-white/10 text-white hover:bg-white hover:text-bordeaux" : "bg-bordeaux text-white hover:bg-vin";
  return (
    <p className={`flex flex-wrap gap-2 ${className}`}>
      <a href={INSTAGRAM} target="_blank" rel="noopener me" className={`${base} ${ton}`}>{IconeInsta}Instagram</a>
      <a href={FACEBOOK} target="_blank" rel="noopener me" className={`${base} ${ton}`}>{IconeFb}Facebook</a>
    </p>
  );
}

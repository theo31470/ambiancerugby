import type { ReactNode } from "react";
import Link from "next/link";
import Reveal from "./Reveal";

/** Titre de section en lettres groovy avec une vague dessinée à l'apparition. */
export default function TitreSection({ children, id, lien, lienTexte, className = "" }: { children: ReactNode; id?: string; lien?: string; lienTexte?: string; className?: string }) {
  return (
    <Reveal className={`flex items-end justify-between gap-4 mb-5 ${className}`}>
      <h2 id={id} className="groovy text-3xl sm:text-4xl text-vin relative pb-3">
        {children}
        <svg className="vague absolute left-0 -bottom-1 w-full h-3" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
          <path d="M2 8c20-8 30 6 50 0s30-8 50 0 30 6 50 0 30-8 46 0" stroke="var(--moutarde)" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      </h2>
      {lien && (
        <Link href={lien} className="text-sm font-semibold text-vin underline underline-offset-4 shrink-0 mb-2">
          {lienTexte}
        </Link>
      )}
    </Reveal>
  );
}

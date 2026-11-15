import Link from "next/link";
import type { Metadata } from "next";
import { TEXTES, EN_VIGUEUR } from "@/components/legal/Juridique";

export const metadata: Metadata = {
  title: "Légal",
  description: "Mentions légales, conditions d'utilisation, confidentialité, cookies, abonnement Supporter et conditions de vente d'Ambiance Rugby.",
  alternates: { canonical: "/legal" },
};

export default function Legal() {
  return (
    <div className="max-w-3xl">
      <h1 className="groovy text-5xl sm:text-6xl text-vin">Légal</h1>
      <p className="mt-3 text-lg">Tout ce qui encadre Ambiance Rugby, écrit pour être lu. Une question : <a href="mailto:contact@ambiance-rugby.fr" className="text-vin underline underline-offset-2">contact@ambiance-rugby.fr</a>.</p>
      <ul className="mt-8 grid gap-3">
        {TEXTES.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="group flex items-center gap-4 rounded-2xl border border-trait bg-surface p-5 hover:border-vin transition-colors">
              <span className="flex-1">
                <span className="titre font-bold text-lg block group-hover:text-vin">{t.titre}</span>
                <span className="text-sm text-sourdine">{t.resume}</span>
              </span>
              <svg viewBox="0 0 20 20" className="w-5 h-5 text-sourdine group-hover:text-vin shrink-0" aria-hidden><path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-sourdine">Textes en vigueur au {EN_VIGUEUR}.</p>
    </div>
  );
}

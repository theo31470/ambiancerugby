import Link from "next/link";

export const EN_VIGUEUR = "16 novembre 2026";

/** Les textes de la rubrique Légal, dans l'ordre où on les présente. */
export const TEXTES = [
  { href: "/legal/mentions-legales", titre: "Mentions légales", resume: "Qui édite le site, qui l'héberge, à qui appartiennent les contenus." },
  { href: "/legal/cgu", titre: "Conditions d'utilisation", resume: "Les règles du site et du compte membre : commentaires, notes, pronos, profil public." },
  { href: "/legal/confidentialite", titre: "Confidentialité", resume: "Les données que nous collectons, pourquoi, combien de temps, et vos droits." },
  { href: "/legal/cookies", titre: "Cookies et traceurs", resume: "Uniquement ce qui fait fonctionner le site : aucune publicité, aucun pistage." },
  { href: "/legal/abonnement", titre: "Conditions de l'abonnement Supporter", resume: "Prix, renouvellement, résiliation en un clic, rétractation." },
  { href: "/boutique/cgv", titre: "Conditions générales de vente de la boutique", resume: "Commande, livraison, retours sous 14 jours, garanties." },
] as const;

export function Titre({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="titre font-extrabold text-xl mt-10 scroll-mt-24">{children}</h2>;
}

/** Mise en page commune d'un texte juridique. */
export function TexteLegal({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <article className="max-w-3xl leading-relaxed [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1 [&_a]:text-vin [&_a]:underline [&_a]:underline-offset-2">
      <p className="text-sm"><Link href="/legal" className="!no-underline font-semibold">Légal</Link></p>
      <h1 className="groovy text-4xl sm:text-5xl text-vin mt-1 [overflow-wrap:anywhere]">{titre}</h1>
      <p className="text-sourdine">En vigueur au {EN_VIGUEUR}.</p>
      {children}
      <nav aria-label="Autres textes" className="mt-14 border-t border-trait pt-6 text-sm">
        <p className="font-semibold">Les autres textes</p>
        <ul className="!list-none !pl-0 flex flex-wrap gap-x-5 gap-y-1">
          {TEXTES.filter((t) => t.titre !== titre).map((t) => <li key={t.href}><Link href={t.href}>{t.titre}</Link></li>)}
        </ul>
      </nav>
    </article>
  );
}

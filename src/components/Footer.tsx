/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Defile from "./deco/Defile";
import { Supporter } from "./deco/Icones";
import TenteLeDrop from "./deco/TenteLeDrop";
import BoutonInstaller from "./app/BoutonInstaller";
import Reseaux from "./Reseaux";

const TRIBUNE = ["#f2b53a", "#ffffff", "#c98595", "#f2b53a", "#f6e4e8", "#934f5e"];

export default function Footer() {
  return (
    <footer className="mt-14 lg:mt-20">
      <Defile ton="or" incline={1.5} />
      <div className="bg-bordeaux text-white/80 -mt-3 pt-14 relative overflow-hidden">
        <div className="hidden lg:block"><TenteLeDrop /></div>
        {/* la tribune fait la ola */}
        <div className="ola flex items-end justify-center gap-1 sm:gap-1.5 h-14 opacity-90 mt-6" aria-hidden>
          {Array.from({ length: 34 }, (_, i) => (
            <span key={i} style={{ ["--i" as string]: i }} className="block">
              <Supporter className="w-4 sm:w-5 h-auto" couleur={TRIBUNE[(i * 7) % TRIBUNE.length]} />
            </span>
          ))}
        </div>
        <div className="border-t border-white/10" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12 grid gap-6 lg:gap-10 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <img src="/logo-blanc.png" alt="Ambiance Rugby" className="h-14 lg:h-20 w-auto" />
            <p className="mt-3 max-w-xs">Le rugby côté tribune : scores en direct, Indice Ambiance, stats et actus.</p>
            <p className="text-white font-semibold mt-5 mb-2">Suis-nous</p>
            <Reseaux clair />
          </div>
          <nav aria-label="Compétitions" className="hidden lg:grid gap-1.5 content-start">
            <p className="text-white font-semibold mb-1">Compétitions</p>
            <Link href="/competitions/top-14" className="hover:text-white">Top 14</Link>
            <Link href="/competitions/pro-d2" className="hover:text-white">Pro D2</Link>
            <Link href="/competitions/champions-cup" className="hover:text-white">Champions Cup</Link>
            <Link href="/competitions/six-nations" className="hover:text-white">Tournoi des Six Nations</Link>
          </nav>
          <nav aria-label="Le site" className="hidden lg:grid gap-1.5 content-start">
            <p className="text-white font-semibold mb-1">Le site</p>
            <Link href="/indice" className="hover:text-white">Indice Ambiance</Link>
            <Link href="/actus" className="hover:text-white">Actus</Link>
            <Link href="/abonnement" className="hover:text-white">Devenir Supporter</Link>
            <Link href="/inscription" className="hover:text-white">Créer un compte</Link>
            <BoutonInstaller className="text-left text-moutarde hover:text-white font-semibold" />
          </nav>
          <div className="content-start">
            <p className="text-white font-semibold mb-1">À consommer avec modération</p>
            <p className="text-white/60 text-xs">La troisième mi-temps se vit avec modération. Données de match fournies par des services tiers ; certaines compétitions sont saisies par la rédaction.</p>
            <p className="text-white font-semibold mt-4 mb-1">La boutique</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link href="/boutique" className="hover:text-white">Le vestiaire</Link>
              <Link href="/suivi" className="hover:text-white">Suivre une commande</Link>
              <Link href="/boutique/aide" className="hover:text-white">Livraison et retours</Link>
              <Link href="/boutique/cgv" className="hover:text-white">CGV</Link>
            </p>
          </div>
        </div>
        <nav aria-label="Légal" className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/60">
            <span>© Ambiance Rugby</span>
            <Link href="/legal/mentions-legales" className="hover:text-white">Mentions légales</Link>
            <Link href="/legal/cgu" className="hover:text-white">Conditions d&apos;utilisation</Link>
            <Link href="/legal/confidentialite" className="hover:text-white">Confidentialité</Link>
            <Link href="/legal/cookies" className="hover:text-white">Cookies</Link>
            <Link href="/legal/abonnement" className="hover:text-white">Abonnement</Link>
            <Link href="/boutique/cgv" className="hover:text-white">CGV boutique</Link>
          </div>
        </nav>
      </div>
    </footer>
  );
}

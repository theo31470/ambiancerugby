import Link from "next/link";
import type { Metadata } from "next";
import { Ballon, Beret, Echarpe, Maillot, Pinte, Podium, Poteaux, Sifflet, Trompette } from "@/components/deco/Icones";
import { getViewer, hasBadge } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/format";
import DevenirSupporter from "@/components/abonnement/DevenirSupporter";

export const metadata: Metadata = { title: "Devenir Supporter", description: "L'abonnement Ambiance Rugby : stats et algorithme complets, alertes de match, contenus exclusifs et badge Supporter, pour 2,99 € par mois ou 29 € par an." };
export const dynamic = "force-dynamic";

const AVANTAGES = [
  { Icone: Poteaux, titre: "L'avant-match complet", texte: "Les 15 duels poste par poste, les buteurs en forme, le pronostic détaillé de l'algorithme et toutes les notes des joueurs." },
  { Icone: Ballon, titre: "Ligues de pronos entre potes", texte: "Créez votre ligue privée, invitez vos amis avec un code et affrontez-les chaque week-end. Vos amis la rejoignent gratuitement." },
  { Icone: Maillot, titre: "XV de la semaine", texte: "Composez votre XV parmi les joueurs de la journée, entrez au classement des sélectionneurs et faites le XV des Supporters." },
  { Icone: Echarpe, titre: "Carnet du supporter", texte: "Chaque match suivi en tribune tamponné dans votre carnet, et votre récap de saison à partager." },
  { Icone: Trompette, titre: "Alertes sur mesure", texte: "Essais de vos joueurs favoris, fin de match serrée, cartons, entrée ou sortie du top 6 au simulateur." },
  { Icone: Podium, titre: "Simulateur avancé et comparateur", texte: "Évolution des chances de votre club jour après jour, scénarios à partager, joueurs comparés saison par saison." },
  { Icone: Pinte, titre: "Notez les joueurs", texte: "Donnez votre note à chaque joueur après le match et élisez l'homme du match des Supporters." },
  { Icone: Sifflet, titre: "Un badge qui monte en grade", texte: "Supporter, Abonné de tribune, Pilier de buvette, Légende du virage : votre badge évolue avec votre fidélité. Et le site aux couleurs de votre club." },
];

export default async function AbonnementPage() {
  const viewer = await getViewer();
  const actif = hasBadge(viewer);

  return (
    <div>
      <section className="pleine-largeur -mt-6 sm:-mt-10 bg-bordeaux text-white relative overflow-hidden">
        <Beret className="absolute -left-6 top-10 w-40 h-auto text-white/[0.06] -rotate-12" />
        <Ballon className="absolute right-[8%] top-12 w-24 text-moutarde/80 rotate-[25deg] [--deco-trait:var(--bordeaux)] hidden sm:block" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 relative text-center">
          <h1 className="groovy text-5xl sm:text-7xl">Passez en <span className="text-moutarde">tribune d&apos;honneur</span></h1>
          <p className="mt-5 text-lg text-white/80 max-w-xl mx-auto">Ambiance Rugby est un média indépendant. L&apos;abonnement Supporter le fait vivre et vous donne le meilleur du site.</p>
          <div className={`mt-10 relative max-w-full ${actif || !viewer ? "inline-block" : "block max-w-5xl mx-auto"}`}>
            <div className="absolute inset-0 rounded-[2rem] bg-moutarde rotate-1" aria-hidden />
            <div className="relative rounded-[2rem] bg-surface text-encre px-5 sm:px-10 py-8 flex flex-col items-center">
              <p className="text-sm font-semibold text-vin">Supporter</p>
              {actif ? (
                <>
                  <p className="mt-2 font-semibold text-ok">Vous êtes Supporter{viewer?.plan_until ? ` jusqu'au ${fmtDate(viewer.plan_until)}` : ""}. Merci !</p>
                  <Link href="/compte/abonnement" className="bouton-discret mt-4">Gérer mon abonnement</Link>
                </>
              ) : (
                <>
                  <p className="mt-1 mb-6 text-sourdine">2,99 € par mois ou 29 € par an</p>
                  <DevenirSupporter connecte={!!viewer} nom={viewer?.display_name ?? ""} depuis={new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(new Date())} />
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="h-avantages" className="mt-16">
        <h2 id="h-avantages" className="groovy text-4xl text-vin text-center">Ce que vous gagnez</h2>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {AVANTAGES.map(({ Icone, titre, texte }) => (
            <li key={titre} className="carte-vie bg-surface border border-trait rounded-[1.5rem] p-6 flex gap-5">
              <span className="shrink-0 w-16 h-16 rounded-2xl bg-teinte grid place-items-center"><Icone className="w-10 h-auto text-vin" /></span>
              <span>
                <span className="titre font-bold text-lg block">{titre}</span>
                <span className="text-sourdine">{texte}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="h-gratuit" className="mt-16 max-w-3xl mx-auto">
        <h2 id="h-gratuit" className="titre text-2xl font-extrabold">Et sans abonnement ?</h2>
        <p className="mt-2 text-sourdine">Le site reste gratuit : scores en direct, calendriers, classements, fiches clubs et joueurs, actus, le top 10 de l&apos;Indice Ambiance, le favori de chaque match et les commentaires. L&apos;abonnement ajoute le détail et le confort.</p>
      </section>
    </div>
  );
}

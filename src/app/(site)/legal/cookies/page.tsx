import Link from "next/link";
import type { Metadata } from "next";
import { TexteLegal, Titre } from "@/components/legal/Juridique";

export const metadata: Metadata = { title: "Cookies et traceurs", description: "Les cookies et données enregistrées sur votre appareil par Ambiance Rugby : uniquement le nécessaire, sans publicité ni mesure d'audience.", alternates: { canonical: "/legal/cookies" } };

const TRACEURS: [string, string, string][] = [
  ["Cookies de session (sb-…)", "Vous garder connecté à votre compte de façon sécurisée", "Jusqu'à la déconnexion"],
  ["Cookies Stripe (__stripe_mid, __stripe_sid)", "Sécuriser le paiement et détecter la fraude, uniquement sur les pages de paiement", "30 minutes à 1 an"],
  ["ar-panier, ar-code-promo", "Garder votre panier et votre code promo d'une page à l'autre", "Jusqu'à la commande ou au vidage"],
  ["ar-son", "Retenir si vous avez coupé les sons du site", "Jusqu'à modification"],
  ["ar-visites, ar-install-refus, ar-lance", "Ne proposer l'installation de l'app qu'à partir de la 2e visite et ne pas insister si vous l'avez refusée ; jouer l'animation de lancement une fois par ouverture", "21 jours pour le refus ; la session pour ar-lance"],
  ["ar-drops", "Retenir votre meilleur score au mini-jeu du pied de page", "Jusqu'à effacement"],
];

export default function Cookies() {
  return (
    <TexteLegal titre="Cookies et traceurs">
      <p>Ambiance Rugby n&apos;utilise <strong>aucun cookie publicitaire, aucun outil de mesure d&apos;audience tiers et aucun bouton de partage qui piste</strong>. Les seuls éléments enregistrés sur votre appareil servent au fonctionnement du site ou à retenir vos propres choix. C&apos;est pourquoi aucune bannière ne vous demande votre accord : la loi en dispense ces traceurs indispensables.</p>

      <p>Pour savoir combien de personnes viennent et par quel canal, nous comptons les pages vues avec un outil maison qui <strong>n&apos;enregistre rien sur votre appareil</strong> : chaque visite est reconnue par une empreinte calculée pour la journée (adresse IP et navigateur, mélangés avec une clé secrète), qui ne permet pas de vous identifier et change chaque jour. Les résultats ne servent qu&apos;à des statistiques globales et sont effacés au bout de 13 mois.</p>

      <Titre id="liste">La liste complète</Titre>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-trait">
        <table className="w-full min-w-[34rem] text-sm text-left">
          <thead className="bg-teinte">
            <tr>{["Nom", "À quoi il sert", "Durée"].map((h) => <th key={h} scope="col" className="p-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {TRACEURS.map(([nom, role, duree]) => (
              <tr key={nom} className="border-t border-trait align-top">
                <th scope="row" className="p-3 font-semibold">{nom}</th>
                <td className="p-3">{role}</td>
                <td className="p-3">{duree}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>L&apos;application installée garde aussi en réserve des fichiers du site (logos, pages déjà vues) pour s&apos;ouvrir vite et fonctionner sans réseau. Cela ne contient aucune donnée personnelle.</p>

      <Titre id="gerer">Les effacer</Titre>
      <p>Vous pouvez effacer ces données à tout moment depuis les réglages de votre navigateur (données de site, pour ambiance-rugby.fr). Vous serez alors déconnecté et votre panier sera vidé. Si un jour nous ajoutons un outil qui demande votre accord, il ne sera activé qu&apos;après votre choix, et cette page sera mise à jour.</p>
      <p>Pour le reste de vos données, voir la <Link href="/legal/confidentialite">politique de confidentialité</Link>.</p>
    </TexteLegal>
  );
}

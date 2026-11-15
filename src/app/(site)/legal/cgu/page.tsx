import Link from "next/link";
import type { Metadata } from "next";
import { TexteLegal, Titre } from "@/components/legal/Juridique";

export const metadata: Metadata = { title: "Conditions d'utilisation", description: "Les règles d'utilisation du site et de l'application Ambiance Rugby et du compte membre.", alternates: { canonical: "/legal/cgu" } };

export default function Cgu() {
  return (
    <TexteLegal titre="Conditions d'utilisation">
      <Titre id="objet">1. Objet</Titre>
      <p>Ces conditions encadrent l&apos;utilisation du site ambiance-rugby.fr et de l&apos;application Ambiance Rugby : scores en direct, fiches des matchs, clubs, joueurs et compétitions, Indice Ambiance, actus, pronostics et espace membre. Utiliser le site vaut acceptation de ces conditions. L&apos;abonnement Supporter et la boutique ont leurs propres conditions : <Link href="/legal/abonnement">abonnement</Link> et <Link href="/boutique/cgv">CGV de la boutique</Link>.</p>

      <Titre id="acces">2. Accès au site</Titre>
      <p>Le site est accessible gratuitement, sans compte. Certaines fonctions demandent un compte membre gratuit (notes des joueurs, commentaires, pronostics, favoris), d&apos;autres l&apos;abonnement Supporter (alertes de match, stats et algorithme complets). Nous faisons notre possible pour que le site soit disponible et à jour, mais une interruption, notamment pour maintenance, ou un retard des données en direct peut arriver. Les scores et statistiques sont donnés à titre d&apos;information : ils ne font pas foi, en particulier pour des paris.</p>

      <Titre id="compte">3. Le compte membre</Titre>
      <ul>
        <li>Il faut avoir au moins 15 ans pour créer un compte, ou l&apos;accord d&apos;un parent en dessous.</li>
        <li>Les informations données doivent être exactes. Le compte est personnel : vous gardez votre mot de passe secret et êtes responsable de ce qui est fait avec votre compte.</li>
        <li>Votre profil est public par défaut (pseudo, avatar, ville, club de cœur, présentation, activité). Vous pouvez le rendre privé à tout moment dans les paramètres de votre compte.</li>
        <li>Vous pouvez supprimer votre compte à tout moment depuis <Link href="/compte/profil#donnees">Mon compte</Link>. Vos données sont alors effacées, sauf celles que la loi nous oblige à garder (factures).</li>
      </ul>

      <Titre id="contributions">4. Commentaires, notes et pronostics</Titre>
      <p>Le rugby a ses valeurs, la tribune aussi. En publiant un commentaire, une note ou un pseudo, vous vous engagez à ne rien publier :</p>
      <ul>
        <li>d&apos;injurieux, diffamatoire, haineux, discriminatoire, violent ou harcelant, envers un joueur, un arbitre, un club, un membre ou quiconque ;</li>
        <li>de pornographique, ou contraire à la loi ;</li>
        <li>qui porte atteinte à la vie privée ou aux droits d&apos;autrui (photos, textes copiés…) ;</li>
        <li>de publicitaire, de répétitif ou destiné à fausser les notes et classements (comptes multiples, votes automatisés).</li>
      </ul>
      <p>Vous restez l&apos;auteur de vos commentaires et nous autorisez à les afficher sur le site et l&apos;application, gratuitement, tant qu&apos;ils y sont publiés. Nous pouvons retirer un contenu qui enfreint ces règles et, en cas de manquement grave ou répété, suspendre ou supprimer le compte. Tout contenu peut être signalé à <a href="mailto:contact@ambiance-rugby.fr">contact@ambiance-rugby.fr</a>.</p>
      <p>Les pronostics et le jeu du XV sont gratuits et sans mise : ils ne donnent lieu à aucun gain d&apos;argent. Si un jour un concours avec des lots est organisé, il aura son propre règlement.</p>

      <Titre id="contenus">5. Nos contenus</Titre>
      <p>Les textes, notes, analyses, l&apos;Indice Ambiance et le design du site nous appartiennent (voir les <Link href="/legal/mentions-legales">mentions légales</Link>). Ils sont faits pour être lus et partagés par lien, pas recopiés. L&apos;aspiration automatique du site ou de ses données est interdite sans notre accord.</p>

      <Titre id="notifications">6. Application et notifications</Titre>
      <p>L&apos;application s&apos;installe depuis le navigateur, gratuitement. Les notifications ne sont envoyées que si vous les avez activées, et se coupent à tout moment depuis <Link href="/compte/alertes">Mes alertes</Link> ou les réglages du téléphone.</p>

      <Titre id="responsabilite">7. Responsabilité</Titre>
      <p>Nous ne sommes pas responsables d&apos;un usage du site contraire à ces conditions, ni des dommages indirects liés à une indisponibilité ou à une erreur dans les données. Chaque membre est responsable de ce qu&apos;il publie.</p>

      <Titre id="modification">8. Modification et droit applicable</Titre>
      <p>Ces conditions peuvent évoluer avec le site ; la version en ligne est celle qui s&apos;applique, et les membres sont prévenus d&apos;un changement important. Elles sont soumises au droit français. En cas de désaccord, écrivez-nous d&apos;abord : on trouve presque toujours une solution.</p>
    </TexteLegal>
  );
}

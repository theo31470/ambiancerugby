import Link from "next/link";
import type { Metadata } from "next";
import { infosVendeur } from "@/lib/shop/vendeur";
import { TexteLegal, Titre } from "@/components/legal/Juridique";

export const metadata: Metadata = { title: "Politique de confidentialité", description: "Les données personnelles traitées par Ambiance Rugby, leurs finalités, leur durée de conservation et vos droits.", alternates: { canonical: "/legal/confidentialite" } };
export const dynamic = "force-dynamic";

const DONNEES: [string, string, string, string][] = [
  ["Compte membre", "E-mail, mot de passe (chiffré, illisible pour nous), pseudo, et si vous les ajoutez : nom affiché, avatar, ville, club de cœur, présentation, préférences", "Exécution des conditions d'utilisation", "Jusqu'à la suppression du compte"],
  ["Activité sur le site", "Commentaires, notes des joueurs, pronostics, équipe du XV, clubs et joueurs suivis, alertes", "Exécution des conditions d'utilisation", "Jusqu'à la suppression du compte (ou du contenu)"],
  ["Notifications push", "Adresse technique d'abonnement de l'appareil, type d'appareil", "Votre consentement, retirable à tout moment", "Jusqu'à la désactivation ou la désinstallation"],
  ["Abonnement Supporter", "Formule, dates, factures, identifiant client chez Stripe. Nous ne voyons jamais votre numéro de carte complet", "Exécution du contrat ; obligations comptables", "Durée de l'abonnement, puis factures 10 ans"],
  ["Commandes de la boutique", "Nom, adresse de livraison, e-mail, téléphone, articles, échanges et photos envoyés au service client", "Exécution du contrat ; obligations comptables", "5 ans après la commande (garanties et litiges), factures 10 ans"],
  ["Journaux techniques", "Adresse IP, navigateur, pages demandées, erreurs", "Intérêt légitime : sécurité et bon fonctionnement", "Quelques jours à 1 an selon l'hébergeur"],
];

const PRESTATAIRES: [string, string, string][] = [
  ["Supabase", "base de données, comptes et connexion", "données stockées à Paris"],
  ["Vercel", "hébergement du site", "pages servies depuis Paris ; société américaine"],
  ["Stripe", "paiement de l'abonnement et de la boutique", "Irlande et États-Unis"],
  ["Resend", "envoi des e-mails (confirmation, factures, alertes)", "États-Unis"],
  ["Printful", "fabrication et expédition des commandes", "Lettonie, États-Unis et ateliers de production"],
  ["Service de notifications du téléphone ou du navigateur (Apple, Google, Mozilla…)", "acheminement des notifications push que vous avez activées", "selon l'appareil"],
];

export default async function Confidentialite() {
  const v = await infosVendeur();
  return (
    <TexteLegal titre="Politique de confidentialité">
      <p>Ambiance Rugby collecte le moins de données possible : pas de publicité, pas de revente, pas de pistage d&apos;un site à l&apos;autre. Voici ce que nous traitons, pourquoi, et comment garder la main.</p>

      <Titre id="responsable">1. Responsable du traitement</Titre>
      <p>{v.titulaire || v.nom}, éditeur d&apos;Ambiance Rugby{v.adresse ? <>, {v.adresse.replace(/\n/g, ", ")}</> : null}. Pour toute question sur vos données : <a href={`mailto:${v.email}`}>{v.email}</a>.</p>

      <Titre id="donnees">2. Les données, leur usage et leur durée</Titre>
      <p>Lire le site sans compte ne demande aucune donnée personnelle, en dehors des journaux techniques.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-trait">
        <table className="w-full min-w-[40rem] text-sm text-left">
          <thead className="bg-teinte">
            <tr>{["", "Données", "Base légale", "Conservation"].map((h) => <th key={h} scope="col" className="p-3 font-semibold align-bottom">{h}</th>)}</tr>
          </thead>
          <tbody>
            {DONNEES.map(([quoi, ...reste]) => (
              <tr key={quoi} className="border-t border-trait align-top">
                <th scope="row" className="p-3 font-semibold">{quoi}</th>
                {reste.map((c) => <td key={c} className="p-3">{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>Votre profil membre est public par défaut, comme indiqué à l&apos;inscription ; vous pouvez le rendre privé dans <Link href="/compte/profil">Mon compte</Link>. Vos commentaires restent visibles sous votre pseudo tant que vous ne les supprimez pas.</p>
      <p>Nous vous envoyons des e-mails liés à votre compte, à votre abonnement et à vos commandes. Nous n&apos;envoyons d&apos;e-mail d&apos;information ou de promotion que si vous l&apos;avez demandé, avec un lien de désinscription dans chacun.</p>

      <Titre id="prestataires">3. Qui reçoit vos données</Titre>
      <p>Seules les personnes qui font tourner Ambiance Rugby y ont accès, et nos prestataires techniques, chacun pour sa tâche :</p>
      <ul>
        {PRESTATAIRES.map(([qui, pour, ou]) => <li key={qui}><strong>{qui}</strong> : {pour} ({ou}).</li>)}
      </ul>
      <p>Le formulaire de paiement est fourni par Stripe et charge sa police d&apos;écriture depuis Google Fonts, qui reçoit alors l&apos;adresse IP du navigateur. Lorsqu&apos;un prestataire traite des données hors de l&apos;Union européenne, le transfert est encadré par le cadre de protection des données UE–États-Unis ou par les clauses contractuelles types de la Commission européenne. Nous ne vendons ni ne louons jamais vos données.</p>

      <Titre id="droits">4. Vos droits</Titre>
      <p>Vous pouvez accéder à vos données, les corriger, les effacer, en limiter l&apos;usage, vous opposer à un traitement fondé sur notre intérêt légitime, retirer votre consentement et récupérer vos données dans un format lisible. Une bonne partie se fait seul, depuis <Link href="/compte/profil#donnees">Mon compte</Link> : modifier le profil, télécharger ses données, supprimer son compte. Pour le reste, écrivez à <a href={`mailto:${v.email}`}>{v.email}</a> : nous répondons sous un mois au plus.</p>
      <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (cnil.fr, 3 place de Fontenoy, 75007 Paris).</p>

      <Titre id="securite">5. Sécurité</Titre>
      <p>Les échanges sont chiffrés (HTTPS), les mots de passe sont stockés sous forme chiffrée, l&apos;accès aux données de chaque membre est cloisonné dans la base, et les paiements ne passent jamais par nos serveurs.</p>

      <Titre id="mineurs">6. Mineurs</Titre>
      <p>Le compte membre est ouvert dès 15 ans. En dessous, l&apos;accord d&apos;un parent est nécessaire. Un parent peut nous demander la suppression du compte de son enfant.</p>

      <Titre id="cookies">7. Cookies</Titre>
      <p>Nous n&apos;utilisons que les traceurs indispensables au fonctionnement du site, détaillés sur la page <Link href="/legal/cookies">Cookies et traceurs</Link>.</p>
    </TexteLegal>
  );
}

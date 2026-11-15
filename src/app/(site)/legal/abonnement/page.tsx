import Link from "next/link";
import type { Metadata } from "next";
import { infosVendeur } from "@/lib/shop/vendeur";
import { FORMULES } from "@/lib/abonnement";
import { TexteLegal, Titre } from "@/components/legal/Juridique";

export const metadata: Metadata = { title: "Conditions de l'abonnement Supporter", description: "Prix, renouvellement, résiliation et rétractation de l'abonnement Supporter Ambiance Rugby.", alternates: { canonical: "/legal/abonnement" } };
export const dynamic = "force-dynamic";

export default async function ConditionsAbonnement() {
  const v = await infosVendeur();
  const { mensuel: m, annuel: a } = FORMULES;
  return (
    <TexteLegal titre="Conditions de l'abonnement Supporter">
      <Titre id="prestataire">1. Le prestataire</Titre>
      <p>L&apos;abonnement Supporter est proposé par {v.titulaire || v.nom}, entrepreneur individuel exerçant sous le nom {v.nom}{v.siret ? <>, SIRET {v.siret}</> : null}{v.adresse ? <>, {v.adresse.replace(/\n/g, ", ")}</> : null}. Contact : <a href={`mailto:${v.email}`}>{v.email}</a>. {v.tva}.</p>

      <Titre id="contenu">2. Ce que comprend l&apos;abonnement</Titre>
      <p>Un compte membre Supporter donne accès, tant que l&apos;abonnement est actif, aux avantages présentés sur la page <Link href="/abonnement">Devenir Supporter</Link> au jour de la souscription : statistiques et algorithme complets, alertes de match (coup d&apos;envoi, essais, score final) par e-mail, dans l&apos;app et en notification, contenus réservés et badge Supporter. Nous pouvons faire évoluer et enrichir ces avantages ; si l&apos;un d&apos;eux devait disparaître durablement, les abonnés en sont prévenus et peuvent résilier sans frais.</p>

      <Titre id="prix">3. Prix et paiement</Titre>
      <ul>
        <li>Formule mensuelle : {m.prix} {m.rythme}.</li>
        <li>Formule annuelle : {a.prix} {a.rythme}.</li>
      </ul>
      <p>Les prix sont toutes taxes comprises ({v.tva}). Un code promo éventuel s&apos;applique dans les conditions annoncées avec lui. Le paiement se fait par carte bancaire, Apple Pay ou Google Pay, traité par Stripe : la première échéance est débitée à la souscription, les suivantes automatiquement à chaque date anniversaire. Chaque paiement donne lieu à une facture, disponible dans <Link href="/compte/factures">Mes factures</Link>. Une modification de prix ne s&apos;applique qu&apos;à la période suivante, après information par e-mail au moins 30 jours avant ; l&apos;abonné peut alors résilier.</p>
      <p>Si un paiement échoue, nous vous prévenons et réessayons pendant quelques jours ; sans régularisation, l&apos;abonnement prend fin et le compte redevient un compte membre gratuit.</p>

      <Titre id="duree">4. Durée et renouvellement</Titre>
      <p>L&apos;abonnement est conclu pour un mois ou un an selon la formule, et se renouvelle automatiquement pour la même durée tant qu&apos;il n&apos;est pas résilié. Pour la formule annuelle, nous vous rappelons par e-mail, entre un et trois mois avant l&apos;échéance, la date du renouvellement et la possibilité de ne pas reconduire l&apos;abonnement (article L215-1 du Code de la consommation).</p>

      <Titre id="resiliation">5. Résiliation</Titre>
      <p>Vous résiliez à tout moment, en un clic, depuis <Link href="/compte/abonnement">Mon abonnement</Link>, ou en écrivant à <a href={`mailto:${v.email}`}>{v.email}</a>. La résiliation prend effet à la fin de la période déjà payée : vous gardez vos avantages jusque-là, et aucun nouveau prélèvement n&apos;a lieu. Vous pouvez revenir sur votre résiliation tant que la période n&apos;est pas terminée. Nous pouvons mettre fin à l&apos;abonnement d&apos;un membre qui enfreint gravement les <Link href="/legal/cgu">conditions d&apos;utilisation</Link>, en remboursant la période non utilisée.</p>

      <Titre id="retractation">6. Droit de rétractation</Titre>
      <p>Vous disposez de <strong>14 jours</strong> à compter de la souscription pour vous rétracter, sans avoir à vous justifier (article L221-18 du Code de la consommation). Comme vous demandez à profiter des avantages Supporter dès le paiement, la somme remboursée est celle de la période non utilisée, calculée au prorata des jours restants (article L221-25). Pour vous rétracter, écrivez-nous à <a href={`mailto:${v.email}`}>{v.email}</a> avec l&apos;adresse e-mail de votre compte, ou utilisez le modèle ci-dessous. Le remboursement est fait sur le moyen de paiement utilisé, sous 14 jours.</p>
      <div className="mt-4 rounded-2xl bg-surface border border-trait p-5 text-sm">
        <p className="font-bold !mt-0">Formulaire de rétractation</p>
        <p>À l&apos;attention de {v.titulaire || v.nom}{v.adresse ? `, ${v.adresse.replace(/\n/g, ", ")}` : ""}, {v.email} :</p>
        <p>Je vous notifie par la présente ma rétractation du contrat d&apos;abonnement Supporter souscrit le [date]. Adresse e-mail du compte : [e-mail]. Nom : [nom]. Date : [date]. Signature (en cas d&apos;envoi papier).</p>
      </div>

      <Titre id="donnees">7. Données personnelles</Titre>
      <p>Les données liées à l&apos;abonnement sont traitées comme décrit dans la <Link href="/legal/confidentialite">politique de confidentialité</Link>.</p>

      <Titre id="litiges">8. Litiges et médiation</Titre>
      <p>Ces conditions sont soumises au droit français. En cas de difficulté, écrivez-nous d&apos;abord : nous cherchons une solution amiable.{" "}
        {v.mediateur
          ? <>À défaut d&apos;accord, vous pouvez recourir gratuitement au médiateur de la consommation : {v.mediateur}.</>
          : <>À défaut d&apos;accord, vous pouvez recourir gratuitement à un médiateur de la consommation, dont nous communiquons les coordonnées sur simple demande.</>}{" "}
        Vous pouvez aussi saisir la juridiction compétente.</p>
    </TexteLegal>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { infosVendeur } from "@/lib/shop/vendeur";
import { seuilLivraisonOfferte } from "@/lib/shop/catalogue";
import { euros } from "@/lib/shop/format";

export const metadata: Metadata = { title: "Conditions générales de vente", alternates: { canonical: "/boutique/cgv" }, description: "Conditions générales de vente de la boutique Ambiance Rugby." };
export const dynamic = "force-dynamic";

/** Conditions générales de vente : vente à distance à des consommateurs, articles fabriqués à la demande. */
function T({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="titre font-extrabold text-xl mt-10 scroll-mt-24">{children}</h2>;
}

export default async function Cgv() {
  const [v, seuil] = await Promise.all([infosVendeur(), seuilLivraisonOfferte().catch(() => null)]);
  return (
    <article className="max-w-3xl leading-relaxed [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1">
      <h1 className="groovy text-5xl text-vin">Conditions générales de vente</h1>
      <p className="text-sourdine">En vigueur au 15 novembre 2026.</p>

      <T id="vendeur">1. Le vendeur</T>
      <p>La boutique <strong>{v.nom}</strong> est exploitée par {v.titulaire || "son titulaire"}, entrepreneur individuel{v.siret ? <>, SIRET {v.siret}</> : null}{v.adresse ? <>, {v.adresse.replace(/\n/g, ", ")}</> : null}. Contact : <a href={`mailto:${v.email}`} className="text-vin underline">{v.email}</a>. {v.tva}.</p>

      <T id="champ">2. Champ d&apos;application</T>
      <p>Les présentes conditions s&apos;appliquent à toute commande passée sur la boutique du site ambiance-rugby.fr par un consommateur. Passer commande vaut acceptation de ces conditions, dans leur version en vigueur au jour de la commande.</p>

      <T id="articles">3. Les articles</T>
      <p>Les articles (vêtements, accessoires, posters, objets) sont fabriqués à la demande, après la commande, par notre partenaire d&apos;impression Printful. Les photos sont des visuels de présentation : de légères différences de teinte sont possibles selon les écrans et les lots de fabrication.</p>

      <T id="prix">4. Prix</T>
      <p>Les prix sont indiqués en euros, toutes taxes comprises ({v.tva}). Les frais de livraison sont calculés selon l&apos;adresse et les articles, et affichés avant le paiement.{seuil ? ` La livraison est offerte dès ${euros(seuil)} d'achat, remises déduites.` : ""} Les codes promo ne sont pas cumulables et s&apos;appliquent dans les conditions annoncées avec le code.</p>

      <T id="commande">5. Commande et paiement</T>
      <p>Le client choisit ses articles, indique son adresse de livraison, vérifie le récapitulatif puis paie. Le paiement par carte bancaire, Apple Pay ou Google Pay est traité par la société Stripe ; il est débité à la commande. La commande est confirmée par e-mail, avec la facture en pièce jointe. Nous pouvons refuser une commande anormale ou passée de mauvaise foi.</p>

      <T id="livraison">6. Fabrication et livraison</T>
      <p>La fabrication prend en général 2 à 5 jours ouvrés, puis le colis est remis au transporteur, avec un numéro de suivi envoyé par e-mail. Le délai de transport indiqué au moment de la commande est donné à titre indicatif. En tout état de cause, la commande est livrée au plus tard 30 jours après sa validation. À défaut, le client peut, après nous avoir mis en demeure de livrer dans un délai raisonnable, annuler sa commande et être remboursé (articles L216-1 et suivants du Code de la consommation).</p>
      <p>Les risques de perte ou d&apos;endommagement passent au client à la réception du colis. Un colis perdu ou arrivé abîmé est remplacé ou remboursé : il suffit de nous le signaler depuis la page de suivi de la commande.</p>

      <T id="retractation">7. Droit de rétractation</T>
      <p>Le client dispose d&apos;un délai de <strong>14 jours</strong> à compter de la réception des articles pour exercer son droit de rétractation, sans avoir à se justifier (article L221-18 du Code de la consommation). Il nous en informe depuis la page de suivi de sa commande (« Faire une demande », motif « Je change d&apos;avis »), par e-mail, ou au moyen du formulaire ci-dessous.</p>
      <p>Les articles sont ensuite renvoyés, non portés et dans leur état d&apos;origine, au plus tard 14 jours après cette information, à l&apos;adresse que nous indiquons. Les frais de retour restent à la charge du client. Nous remboursons la totalité des sommes versées, frais de livraison initiaux compris (sur la base de la livraison standard), au plus tard 14 jours après avoir été informés de la rétractation, avec le même moyen de paiement. Nous pouvons différer le remboursement jusqu&apos;à la réception des articles ou la preuve de leur expédition. La valeur d&apos;un article dégradé par une manipulation autre que celle nécessaire pour l&apos;essayer peut être déduite du remboursement.</p>
      <div className="mt-4 rounded-2xl bg-surface border border-trait p-5 text-sm">
        <p className="font-bold">Formulaire de rétractation</p>
        <p>À l&apos;attention de {v.titulaire || v.nom}{v.adresse ? `, ${v.adresse.replace(/\n/g, ", ")}` : ""}, {v.email} :</p>
        <p>Je vous notifie par la présente ma rétractation du contrat portant sur la vente des biens ci-dessous : [articles]. Commandé le [date] / reçu le [date]. Numéro de commande : [AR-…]. Nom du consommateur : [nom]. Adresse du consommateur : [adresse]. Date : [date]. Signature (en cas d&apos;envoi papier).</p>
      </div>

      <T id="garanties">8. Garanties légales</T>
      <p>Tous les articles bénéficient de la garantie légale de conformité (articles L217-3 et suivants du Code de la consommation) et de la garantie des vices cachés (articles 1641 et suivants du Code civil).</p>
      <p>Au titre de la garantie de conformité, le client dispose de deux ans à compter de la livraison pour obtenir la réparation ou le remplacement d&apos;un article non conforme, ou à défaut une réduction du prix ou le remboursement, sans frais. Pendant ce délai, le défaut est présumé exister au moment de la livraison. En pratique : un article abîmé, mal imprimé ou différent de la commande nous est signalé avec une photo depuis la page de suivi, et nous le remplaçons ou le remboursons.</p>

      <T id="sav">9. Service client</T>
      <p>Pour toute question ou réclamation : depuis la page de suivi de la commande, ou à <a href={`mailto:${v.email}`} className="text-vin underline">{v.email}</a>. Nous répondons sous 48 heures ouvrées. Voir aussi la page <Link href="/boutique/aide" className="text-vin underline">Aide, livraison et retours</Link>.</p>

      <T id="donnees">10. Données personnelles</T>
      <p>Les données de commande (nom, adresse, e-mail, téléphone) servent uniquement à traiter la commande, la livraison, la facturation et le service client. Elles sont transmises à nos prestataires dans cette seule limite : Printful pour la fabrication et l&apos;expédition, Stripe pour le paiement, Resend pour l&apos;envoi des e-mails. Les factures sont conservées 10 ans, comme l&apos;exige la loi. Vous pouvez accéder à vos données, les rectifier ou en demander l&apos;effacement à {v.email}, et saisir la CNIL si besoin.</p>

      <T id="litiges">11. Litiges et médiation</T>
      <p>Les présentes conditions sont soumises au droit français. En cas de litige, le client s&apos;adresse d&apos;abord à nous pour trouver une solution amiable.{" "}
        {v.mediateur
          ? <>À défaut d&apos;accord, il peut recourir gratuitement au médiateur de la consommation : {v.mediateur}.</>
          : <>À défaut d&apos;accord, il peut recourir gratuitement à un médiateur de la consommation, dont nous communiquons les coordonnées sur simple demande.</>}{" "}
        Il peut aussi saisir la juridiction compétente.</p>
    </article>
  );
}

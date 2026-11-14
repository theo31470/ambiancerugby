import Link from "next/link";
import type { Metadata } from "next";
import { seuilLivraisonOfferte } from "@/lib/shop/catalogue";
import { infosVendeur } from "@/lib/shop/vendeur";
import { euros } from "@/lib/shop/format";

export const metadata: Metadata = { title: "Aide, livraison et retours", description: "Délais de fabrication et de livraison, suivi de colis, retours sous 14 jours, échanges et paiement sur la boutique Ambiance Rugby." };
export const dynamic = "force-dynamic";

export default async function Aide() {
  const [seuil, v] = await Promise.all([seuilLivraisonOfferte().catch(() => null), infosVendeur()]);
  const rubriques: { id: string; titre: string; questions: [string, React.ReactNode][] }[] = [
    {
      id: "livraison", titre: "Livraison",
      questions: [
        ["Quand vais-je recevoir ma commande ?", "Chaque article est fabriqué pour vous à la commande, puis expédié sous 2 à 5 jours ouvrés. Comptez ensuite 3 à 7 jours de transport en France métropolitaine, un peu plus pour l'étranger. Le délai estimé s'affiche avec votre adresse, avant de payer."],
        ["Combien coûte la livraison ?", <>Les frais de port sont calculés au centime près selon votre adresse et vos articles, et affichés avant le paiement.{seuil ? <> La livraison est <strong>offerte dès {euros(seuil)} d&apos;achat</strong>.</> : null}</>],
        ["Où livrez-vous ?", "En France, à Monaco, en Belgique, en Suisse, au Luxembourg, dans plusieurs pays d'Europe, au Royaume-Uni et au Canada : choisissez votre pays au moment de commander, les frais s'adaptent."],
        ["Mes articles arrivent dans plusieurs colis ?", "Possible : les articles sont fabriqués dans l'atelier le plus proche de chez vous. Chaque colis a son propre numéro de suivi."],
      ],
    },
    {
      id: "suivi", titre: "Suivi de commande",
      questions: [
        ["Comment suivre ma commande ?", <>Avec le lien reçu dans l&apos;e-mail de confirmation, ou sur la page <Link href="/suivi" className="text-vin underline underline-offset-2">Suivre une commande</Link> avec votre numéro (AR-…) et votre e-mail. Avec un compte, toutes vos commandes sont dans <Link href="/compte/commandes" className="text-vin underline underline-offset-2">Mes commandes</Link>.</>],
        ["Quand ai-je le numéro de colis ?", "Dès que le colis quitte l'atelier : un e-mail vous l'envoie avec le lien du transporteur, et il apparaît sur la page de suivi."],
      ],
    },
    {
      id: "retours", titre: "Retours, échanges et réclamations",
      questions: [
        ["J'ai changé d'avis, puis-je retourner un article ?", "Oui : vous avez 14 jours après réception pour nous le dire, sans avoir à vous justifier. Faites la demande depuis la page de suivi de la commande (« Faire une demande »). Renvoyez ensuite l'article non porté, dans son état d'origine, sous 14 jours. Les frais de retour sont à votre charge. Nous vous remboursons sous 14 jours, dès réception de l'article."],
        ["L'article est abîmé, mal imprimé ou ce n'est pas le bon", "C'est à nous de réparer : faites une demande avec une photo du problème depuis la page de suivi. L'article est refabriqué et renvoyé, ou remboursé, sans frais, et le plus souvent sans avoir à le renvoyer."],
        ["Je me suis trompé de taille", <>Faites une demande de retour : nous vous remboursons à réception, et vous pouvez recommander la bonne taille. Pour éviter l&apos;erreur, chaque vêtement a son guide des tailles sur sa fiche.</>],
        ["Mon colis n'arrive pas", "Si le suivi ne bouge plus depuis plusieurs jours, ou si le colis est indiqué livré sans être arrivé, faites une demande « Colis pas reçu » : nous ouvrons une enquête avec le transporteur et renvoyons la commande si elle est perdue."],
        ["Puis-je annuler ma commande ?", "Tant qu'elle n'est pas partie en fabrication, oui : faites une demande « Autre question » au plus vite. Une fois fabriquée, elle suit la règle des 14 jours après réception."],
      ],
    },
    {
      id: "paiement", titre: "Paiement et factures",
      questions: [
        ["Quels moyens de paiement ?", "Carte bancaire (CB, Visa, Mastercard), Apple Pay et Google Pay. Le paiement est traité par Stripe : vos coordonnées bancaires ne passent jamais par Ambiance Rugby."],
        ["Où est ma facture ?", "Elle est jointe à l'e-mail de confirmation et téléchargeable depuis la page de suivi. En cas de remboursement, un avoir est émis et envoyé automatiquement."],
        ["J'ai un code promo", "Saisissez-le à l'étape Livraison, dans le récapitulatif de la commande : la remise s'applique tout de suite et figure sur votre facture."],
      ],
    },
  ];
  return (
    <div className="max-w-3xl">
      <h1 className="groovy text-5xl text-vin">Aide, livraison et retours</h1>
      <p className="mt-3 text-lg text-sourdine">Les réponses aux questions qu&apos;on nous pose le plus. Une autre question ? Écrivez-nous à <a href={`mailto:${v.email}`} className="text-vin underline underline-offset-2">{v.email}</a>.</p>
      <nav aria-label="Rubriques" className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
        {rubriques.map((r) => <a key={r.id} href={`#${r.id}`} className="rounded-full border border-trait px-3.5 py-1.5 hover:border-vin">{r.titre}</a>)}
      </nav>
      {rubriques.map((r) => (
        <section key={r.id} id={r.id} aria-labelledby={`h-${r.id}`} className="mt-10 scroll-mt-24">
          <h2 id={`h-${r.id}`} className="titre font-extrabold text-2xl">{r.titre}</h2>
          <div className="mt-3 border-t border-trait divide-y divide-trait">
            {r.questions.map(([q, rep], i) => (
              <details key={q} className="group py-4" open={r.id === "retours" && i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{q}<span aria-hidden className="shrink-0 text-xl transition-transform group-open:rotate-45">+</span></summary>
                <div className="mt-2 text-sourdine leading-relaxed">{rep}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
      <p className="mt-12 text-sm text-sourdine">Les règles complètes sont dans nos <Link href="/boutique/cgv" className="text-vin underline underline-offset-2">conditions générales de vente</Link>.</p>
    </div>
  );
}

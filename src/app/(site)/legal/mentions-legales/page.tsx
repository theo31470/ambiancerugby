import type { Metadata } from "next";
import { infosVendeur } from "@/lib/shop/vendeur";
import { TexteLegal, Titre } from "@/components/legal/Juridique";

export const metadata: Metadata = { title: "Mentions légales", description: "Éditeur, directeur de la publication, hébergement et propriété intellectuelle du site Ambiance Rugby.", alternates: { canonical: "/legal/mentions-legales" } };
export const dynamic = "force-dynamic";

export default async function MentionsLegales() {
  const v = await infosVendeur();
  return (
    <TexteLegal titre="Mentions légales">
      <Titre id="editeur">Éditeur du site</Titre>
      <p>Le site ambiance-rugby.fr et l&apos;application Ambiance Rugby sont édités par <strong>{v.titulaire || v.nom}</strong>, entrepreneur individuel exerçant sous le nom commercial {v.nom}.</p>
      <ul>
        {v.siret && <li>SIRET : {v.siret}</li>}
        {v.adresse && <li>Adresse : {v.adresse.replace(/\n/g, ", ")}</li>}
        <li>E-mail : <a href={`mailto:${v.email}`}>{v.email}</a></li>
        <li>{v.tva}</li>
      </ul>

      <Titre id="publication">Directeur de la publication</Titre>
      <p>{v.titulaire || v.nom}, joignable à <a href={`mailto:${v.email}`}>{v.email}</a>.</p>

      <Titre id="hebergement">Hébergement</Titre>
      <ul>
        <li>Site et application : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com). Pages servies depuis Paris.</li>
        <li>Base de données et comptes membres : Supabase Inc., 970 Toa Payoh North #07-04, Singapour 318992 (supabase.com). Données stockées à Paris (Amazon Web Services, région eu-west-3).</li>
      </ul>

      <Titre id="contenus">Propriété intellectuelle</Titre>
      <p>Le nom et le logo Ambiance Rugby, les textes, illustrations, l&apos;Indice Ambiance, les notes et analyses de la rédaction et la mise en forme du site sont protégés. Toute reproduction ou réutilisation, totale ou partielle, sans autorisation écrite est interdite, sauf courte citation avec mention de la source et lien vers la page.</p>
      <p>Les noms, logos et marques des clubs, sélections, compétitions et organisateurs cités appartiennent à leurs titulaires respectifs. Ils sont utilisés à seule fin d&apos;information sur les rencontres, sans lien de partenariat ni approbation de leur part.</p>
      <p>Les résultats, compositions et statistiques de match proviennent en partie de sources tierces publiques (notamment World Rugby et ESPN) et sont complétés par la rédaction. Certaines informations biographiques des joueurs s&apos;appuient sur Wikipédia, sous licence CC BY-SA. Malgré notre attention, une erreur reste possible : signalez-la à <a href={`mailto:${v.email}`}>{v.email}</a> et nous la corrigeons.</p>

      <Titre id="signalement">Signaler un contenu</Titre>
      <p>Un commentaire ou un profil de membre vous semble illicite ou porte atteinte à vos droits ? Écrivez à <a href={`mailto:${v.email}`}>{v.email}</a> en précisant la page concernée, le contenu en cause et la raison du signalement. Nous l&apos;examinons rapidement et retirons tout contenu manifestement illicite.</p>

      <Titre id="liens">Réseaux sociaux et liens</Titre>
      <p>Ambiance Rugby est aussi présent sur Instagram et TikTok. Ces plateformes ont leurs propres conditions et règles de confidentialité, qui s&apos;appliquent lorsque vous les utilisez. Nous ne sommes pas responsables du contenu des sites tiers vers lesquels renvoient nos liens.</p>
    </TexteLegal>
  );
}

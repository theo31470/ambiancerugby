import Link from "next/link";
import type { Metadata } from "next";
import { Ballon, Beret, Echarpe, Pinte, Poteaux, Trompette } from "@/components/deco/Icones";
import { createClient, getViewer, hasBadge } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/format";
import { rejoindreListe } from "../actions";

export const metadata: Metadata = { title: "Devenir Supporter", description: "L'abonnement Ambiance Rugby : stats et algorithme complets, alertes de match, contenus exclusifs et badge Supporter, pour 2,99 € par mois." };
export const dynamic = "force-dynamic";

const AVANTAGES = [
  { Icone: Poteaux, titre: "Stats et algorithme complets", texte: "Pronostics en pourcentages avec l'écart estimé, Indice Ambiance de toutes les équipes, courbes d'évolution, notes et stats détaillées des joueurs." },
  { Icone: Trompette, titre: "Alertes de match", texte: "Coup d'envoi, essais, mi-temps et score final de vos clubs suivis, dans votre espace et en notification sur votre appareil." },
  { Icone: Pinte, titre: "Contenus exclusifs", texte: "Analyses, avant-matchs et articles réservés aux Supporters." },
  { Icone: Echarpe, titre: "Badge Supporter", texte: "Votre badge doré sur votre profil et sous chacun de vos commentaires." },
];

export default async function AbonnementPage({ searchParams }: PageProps<"/abonnement">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const actif = hasBadge(viewer);
  let inscrit = false;
  if (viewer && !actif) {
    const supabase = await createClient();
    const { count } = await supabase.from("subscription_interest").select("*", { count: "exact", head: true }).eq("user_id", viewer.id);
    inscrit = (count ?? 0) > 0;
  }

  return (
    <div>
      <section className="pleine-largeur -mt-6 sm:-mt-10 bg-bordeaux text-white relative overflow-hidden">
        <Beret className="absolute -left-6 top-10 w-40 h-auto text-white/[0.06] -rotate-12" />
        <Ballon className="absolute right-[8%] top-12 w-24 text-moutarde/80 rotate-[25deg] [--deco-trait:var(--bordeaux)] hidden sm:block" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 relative text-center">
          <h1 className="groovy text-5xl sm:text-7xl">Passez en <span className="text-moutarde">tribune d&apos;honneur</span></h1>
          <p className="mt-5 text-lg text-white/80 max-w-xl mx-auto">Ambiance Rugby est un média indépendant. L&apos;abonnement Supporter le fait vivre et vous donne le meilleur du site.</p>
          <div className="mt-10 inline-block relative">
            <div className="absolute inset-0 rounded-[2rem] bg-moutarde rotate-2" aria-hidden />
            <div className="relative rounded-[2rem] bg-surface text-encre px-10 py-8">
              <p className="text-sm font-semibold text-vin">Supporter</p>
              <p className="mt-1"><span className="groovy text-6xl">2,99 €</span><span className="text-sourdine"> / mois</span></p>
              <p className="text-sm text-sourdine mt-1">Sans engagement</p>
              <div className="mt-6">
                {actif ? (
                  <p className="font-semibold text-ok">Vous êtes Supporter{viewer?.plan_until ? ` jusqu'au ${fmtDate(viewer.plan_until)}` : ""}. Merci !</p>
                ) : !viewer ? (
                  <Link href="/inscription" className="bouton-or"><Ballon className="tourne w-6" />Créer mon compte d&apos;abord</Link>
                ) : inscrit || sp.ok ? (
                  <p className="font-semibold text-vin max-w-xs">C&apos;est noté ! On vous prévient dès que l&apos;abonnement ouvre.</p>
                ) : (
                  <form action={rejoindreListe}>
                    <button className="bouton-or"><Ballon className="tourne w-6" />Me prévenir à l&apos;ouverture</button>
                  </form>
                )}
              </div>
              {!actif && <p className="mt-4 text-xs text-sourdine max-w-xs mx-auto">Le paiement en ligne arrive très bientôt. Inscrivez-vous pour être prévenu en premier.</p>}
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

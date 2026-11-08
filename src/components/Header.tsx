/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { createClient, getViewer, hasBadge } from "@/lib/supabase/server";
import Cloche from "./Cloche";
import EnteteCollant from "./nav/EnteteCollant";
import NavBureau from "./nav/NavBureau";
import MenuVestiaire from "./nav/MenuVestiaire";
import SonStade from "./deco/SonStade";
import BoutonPanier from "./shop/BoutonPanier";
import { Ballon, Journal } from "./deco/Icones";

export default async function Header() {
  const viewer = await getViewer();
  const staff = !!viewer && (viewer.role === "admin" || viewer.role === "editor");
  const badge = hasBadge(viewer);
  let unread = 0;
  if (viewer) {
    const supabase = await createClient();
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null);
    unread = count ?? 0;
  }
  return (
    <EnteteCollant>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-3 xl:gap-5 h-16 sm:h-20 group-data-[reduit]:h-14 transition-[height] duration-300">
        <Link href="/" className="shrink-0 logo-roulis relative z-[70]" aria-label="Ambiance Rugby, accueil">
          <img src="/logo-blanc.png" alt="Ambiance Rugby" width={340} height={256} className="h-12 sm:h-16 group-data-[reduit]:h-10 w-auto transition-[height] duration-300" />
        </Link>
        <div className="hidden xl:block flex-1 min-w-0">
          <NavBureau />
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-1.5 text-sm font-semibold">
          <span className="hidden sm:block"><SonStade /></span>
          {staff && (
            <Link href="/admin" title="Espace rédaction" className="hidden xl:grid place-items-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20">
              <Journal className="h-5 w-auto text-moutarde [--deco-trait:var(--vin)]" />
              <span className="sr-only">Espace rédaction</span>
            </Link>
          )}
          {viewer && !badge && (
            <Link href="/abonnement" className="hidden xl:inline-flex items-center gap-1.5 whitespace-nowrap pl-2 pr-3.5 py-1.5 rounded-full bg-moutarde text-bordeaux hover:brightness-105">
              <Ballon className="w-6 text-bordeaux" />
              <span className="2xl:hidden">Supporter</span>
              <span className="hidden 2xl:inline">Devenir Supporter</span>
            </Link>
          )}
          <span className="hidden sm:block"><BoutonPanier /></span>
          {viewer && <Cloche userId={viewer.id} initial={unread} />}
          {viewer ? (
            <Link href="/compte" className="hidden sm:flex items-center gap-2 pl-1 pr-1 py-1 rounded-full hover:bg-white/10" aria-label="Mon espace">
              <span className={`w-9 h-9 rounded-full grid place-items-center titre font-bold ${badge ? "bg-moutarde text-bordeaux ring-2 ring-white" : "bg-white/15"}`}>
                {(viewer.display_name ?? viewer.email ?? "?").slice(0, 1).toUpperCase()}
              </span>
            </Link>
          ) : (
            <>
              <Link href="/connexion" className="hidden sm:inline-flex px-3 py-1.5 rounded-full hover:bg-white/10">Connexion</Link>
              <Link href="/inscription" className="hidden sm:inline-flex px-3.5 py-1.5 rounded-full bg-white text-vin hover:bg-white/90">Rejoindre</Link>
            </>
          )}
          <span className="xl:hidden"><MenuVestiaire connecte={!!viewer} supporter={!!viewer?.supporter} staff={staff} /></span>
        </div>
      </div>
    </EnteteCollant>
  );
}

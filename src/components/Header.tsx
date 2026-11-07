/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { createClient, getViewer, hasBadge } from "@/lib/supabase/server";
import NavLinks from "./NavLinks";
import Cloche from "./Cloche";

export default async function Header() {
  const viewer = await getViewer();
  const staff = viewer && (viewer.role === "admin" || viewer.role === "editor");
  let unread = 0;
  if (viewer) {
    const supabase = await createClient();
    const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null);
    unread = count ?? 0;
  }
  return (
    <header className="bg-vin text-white relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-3 sm:gap-8 h-16 sm:h-20">
        <Link href="/" className="shrink-0 logo-roulis" aria-label="Ambiance Rugby, accueil">
          <img src="/logo-blanc.png" alt="Ambiance Rugby" width={340} height={256} className="h-12 sm:h-16 w-auto" />
        </Link>
        <div className="hidden lg:block flex-1">
          <NavLinks />
        </div>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 text-sm font-semibold">
          {staff && (
            <Link href="/admin" className="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20">
              Rédaction
            </Link>
          )}
          {viewer && !hasBadge(viewer) && (
            <Link href="/abonnement" className="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-moutarde text-bordeaux hover:brightness-105">
              Devenir Supporter
            </Link>
          )}
          {viewer && <Cloche userId={viewer.id} initial={unread} />}
          {viewer ? (
            <Link href="/compte" className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-white/10" aria-label="Mon espace">
              <span className={`w-9 h-9 rounded-full grid place-items-center titre font-bold ${hasBadge(viewer) ? "bg-moutarde text-bordeaux ring-2 ring-white" : "bg-white/15"}`}>
                {(viewer.display_name ?? viewer.email ?? "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden md:inline">Mon espace</span>
            </Link>
          ) : (
            <>
              <Link href="/connexion" className="px-3 py-1.5 rounded-full hover:bg-white/10">Connexion</Link>
              <Link href="/inscription" className="px-3.5 py-1.5 rounded-full bg-white text-vin hover:bg-white/90">Rejoindre</Link>
            </>
          )}
        </div>
      </div>
      <div className="lg:hidden border-t border-white/15">
        <div className="px-2 max-w-6xl mx-auto">
          <NavLinks />
        </div>
      </div>
    </header>
  );
}

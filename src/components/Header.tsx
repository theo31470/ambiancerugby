/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import NavLinks from "./NavLinks";

export default async function Header() {
  const viewer = await getViewer();
  const staff = viewer && (viewer.role === "admin" || viewer.role === "editor");
  return (
    <header className="bg-vin text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-4 sm:gap-8 h-16 sm:h-20">
        <Link href="/" className="shrink-0" aria-label="Ambiance Rugby, accueil">
          <img src="/logo-blanc.png" alt="Ambiance Rugby" width={340} height={256} className="h-12 sm:h-16 w-auto" />
        </Link>
        <div className="hidden md:block flex-1">
          <NavLinks />
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm font-semibold">
          {staff && (
            <Link href="/admin" className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20">
              Rédaction
            </Link>
          )}
          {viewer ? (
            <Link href="/compte" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10">
              <span className="w-8 h-8 rounded-full bg-moutarde text-bordeaux grid place-items-center titre font-bold">
                {(viewer.display_name ?? viewer.email ?? "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden sm:inline">Mon compte</span>
            </Link>
          ) : (
            <Link href="/connexion" className="px-3 py-1.5 rounded-md bg-white text-vin hover:bg-white/90">
              Se connecter
            </Link>
          )}
        </div>
      </div>
      <div className="md:hidden border-t border-white/15">
        <div className="px-2">
          <NavLinks />
        </div>
      </div>
    </header>
  );
}

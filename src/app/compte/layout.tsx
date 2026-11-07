import { redirect } from "next/navigation";
import { getViewer, hasBadge } from "@/lib/supabase/server";
import { signOut } from "../actions";
import CompteNav from "./CompteNav";

export const dynamic = "force-dynamic";

export default async function CompteLayout({ children }: LayoutProps<"/compte">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/connexion?suite=/compte");
  const badge = hasBadge(viewer);
  return (
    <div>
      <section className="pleine-largeur -mt-6 sm:-mt-10 bg-bordeaux text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6 flex flex-wrap items-end gap-5">
          <span className={`w-16 h-16 rounded-full grid place-items-center groovy text-3xl ${badge ? "bg-moutarde text-bordeaux ring-4 ring-white/20" : "bg-white/15"}`}>
            {(viewer.display_name ?? viewer.email ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="groovy text-4xl sm:text-5xl">Salut {viewer.display_name ?? "toi"} !</h1>
            <p className="text-white/70 mt-1">
              {badge ? <span className="text-[11px] font-bold rounded-full bg-moutarde text-bordeaux px-2 py-0.5 mr-2 align-middle">Supporter</span> : null}
              {viewer.email}
            </p>
          </div>
          <form action={signOut} className="ml-auto">
            <button className="text-sm font-semibold rounded-full px-3 py-1.5 hover:bg-white/10">Se déconnecter</button>
          </form>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6"><CompteNav /></div>
      </section>
      <div className="mt-10">{children}</div>
    </div>
  );
}

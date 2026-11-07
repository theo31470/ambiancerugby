import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Rédaction", robots: { index: false } };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/matchs", label: "Matchs et direct" },
  { href: "/admin/clubs", label: "Clubs" },
  { href: "/admin/joueurs", label: "Joueurs" },
  { href: "/admin/donnees", label: "Données" },
  { href: "/indice", label: "Voir l'Indice" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/connexion?suite=/admin");
  if (viewer.role === "user") {
    return (
      <div className="max-w-md">
        <h1 className="text-3xl font-extrabold">Espace rédaction</h1>
        <p className="mt-3 text-sourdine">Votre compte n&apos;a pas accès à la rédaction. Demandez à un administrateur de vous donner le rôle de rédacteur.</p>
      </div>
    );
  }
  const nav = viewer.role === "admin" ? [...NAV, { href: "/admin/utilisateurs", label: "Utilisateurs" }] : NAV;
  return (
    <div className="grid gap-8 md:grid-cols-[12rem_1fr]">
      <nav aria-label="Rédaction" className="defile-scroll flex md:flex-col gap-1 overflow-x-auto md:sticky md:top-4 md:self-start">
        <p className="hidden md:block titre font-extrabold text-lg mb-2">Rédaction</p>
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold hover:bg-teinte">
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

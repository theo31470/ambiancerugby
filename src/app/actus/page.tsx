import Link from "next/link";
import type { Metadata } from "next";
import ArticleCard, { ArticleHero } from "@/components/ArticleCard";
import { getArticles } from "@/lib/queries";
import { CATEGORIES } from "@/lib/format";

export const metadata: Metadata = { title: "Actus" };
export const dynamic = "force-dynamic";

export default async function ActusPage({ searchParams }: PageProps<"/actus">) {
  const sp = await searchParams;
  const cat = typeof sp.rubrique === "string" && CATEGORIES[sp.rubrique] ? sp.rubrique : "";
  const articles = await getArticles({ category: cat || undefined, limit: 40 });
  const [first, ...rest] = articles;

  return (
    <div>
      <h1 className="groovy text-5xl sm:text-6xl text-vin">Actus</h1>
      <nav aria-label="Rubriques" className="defile-scroll mt-5 flex gap-2 overflow-x-auto pb-1">
        <Link href="/actus" className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold border ${!cat ? "bg-encre text-fond border-encre" : "border-trait hover:bg-teinte"}`}>Tout</Link>
        {Object.entries(CATEGORIES).map(([k, v]) => (
          <Link key={k} href={`/actus?rubrique=${k}`} className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold border ${cat === k ? "bg-encre text-fond border-encre" : "border-trait hover:bg-teinte"}`}>{v}</Link>
        ))}
      </nav>
      {!first ? (
        <p className="mt-8 bg-surface border border-trait rounded-lg p-5 text-sourdine">Rien dans cette rubrique pour le moment.</p>
      ) : (
        <div className="mt-8 grid gap-10">
          <ArticleHero a={first} />
          <div className="grid gap-6 sm:grid-cols-2">{rest.map((a) => <ArticleCard key={a.id} a={a} />)}</div>
        </div>
      )}
    </div>
  );
}

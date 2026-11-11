import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { createClient } from "@/lib/supabase/server";
import Notice from "@/components/admin/Notice";
import { CATEGORIES, fmtRelative } from "@/lib/format";

export default async function AdminArticles({ searchParams }: PageProps<"/studio/articles">) {
  const sp = await searchParams;
  const db = await createClient();
  const { data } = await db.from("articles").select("id,slug,title,status,category,published_at,updated_at").order("updated_at", { ascending: false }).limit(200);
  return (
    <div>
      <PageHeader titre="Articles" description="Les actus du site. Un article « Exclusif » n'est lisible en entier que par les Supporters."
        actions={<Link href="/studio/articles/nouveau" className="bouton">Écrire un article</Link>} />
      <Notice sp={sp} />
      {(data ?? []).length === 0 ? <p className="text-sourdine">Aucun article. Écrivez le premier.</p> : (
        <ul className="bg-surface border border-trait rounded-lg divide-y divide-trait">
          {(data ?? []).map((a) => (
            <li key={a.id}>
              <Link href={`/studio/articles/${a.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-teinte">
                <span className="font-semibold flex-1 min-w-48">{a.title}</span>
                <span className="text-xs text-sourdine">{CATEGORIES[a.category]}</span>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${a.status === "published" ? "bg-ok/10 text-ok" : "bg-teinte text-sourdine"}`}>
                  {a.status === "published" ? "Publié" : "Brouillon"}
                </span>
                <span className="text-xs text-sourdine w-24 text-right">{fmtRelative(a.updated_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

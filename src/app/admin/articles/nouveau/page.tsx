import ArticleForm from "@/components/admin/ArticleForm";
import Notice from "@/components/admin/Notice";
import { publicClient } from "@/lib/supabase/server";

export default async function NouvelArticle({ searchParams }: PageProps<"/admin/articles/nouveau">) {
  const sp = await searchParams;
  const db = publicClient();
  const [{ data: comps }, { data: teams }] = await Promise.all([
    db.from("competitions").select("id,name").order("sort_order"),
    db.from("teams").select("id,name").order("name"),
  ]);
  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-6">Nouvel article</h1>
      <Notice sp={sp} />
      <ArticleForm competitions={comps ?? []} teams={teams ?? []} back="/admin/articles/nouveau" />
    </div>
  );
}

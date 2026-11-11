import ArticleForm from "@/components/admin/ArticleForm";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { publicClient } from "@/lib/supabase/server";

export default async function NouvelArticle({ searchParams }: PageProps<"/studio/articles/nouveau">) {
  const sp = await searchParams;
  const db = publicClient();
  const [{ data: comps }, { data: teams }] = await Promise.all([
    db.from("competitions").select("id,name").order("sort_order"),
    db.from("teams").select("id,name").order("name"),
  ]);
  return (
    <div>
      <PageHeader titre="Nouvel article" description="Écrivez, choisissez une image et rattachez l'article à un club ou une compétition pour qu'il apparaisse sur leurs pages." />
      <Notice sp={sp} />
      <ArticleForm competitions={comps ?? []} teams={teams ?? []} back="/studio/articles/nouveau" />
    </div>
  );
}

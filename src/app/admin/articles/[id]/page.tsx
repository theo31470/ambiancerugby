import { notFound } from "next/navigation";
import PageHeader from "@/components/admin/PageHeader";
import ArticleForm from "@/components/admin/ArticleForm";
import Notice from "@/components/admin/Notice";
import { createClient, publicClient } from "@/lib/supabase/server";
import type { Article } from "@/lib/types";

export default async function EditArticle({ params, searchParams }: PageProps<"/admin/articles/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const db = await createClient();
  const { data: rows } = await db.rpc("get_article_for_edit", { p_id: id });
  const article = (rows ?? [])[0];
  if (!article) notFound();
  const pub = publicClient();
  const [{ data: comps }, { data: teams }] = await Promise.all([
    pub.from("competitions").select("id,name").order("sort_order"),
    pub.from("teams").select("id,name").order("name"),
  ]);
  return (
    <div>
      <PageHeader titre="Modifier l'article" />
      <Notice sp={sp} />
      <ArticleForm article={article as Article} competitions={comps ?? []} teams={teams ?? []} back={`/admin/articles/${id}`} />
    </div>
  );
}

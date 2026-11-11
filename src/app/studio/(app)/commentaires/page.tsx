import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { supprimerCommentaires } from "../actions";
import { fmtRelative } from "@/lib/format";

const PAR_PAGE = 50;
type Com = {
  id: string; body: string; created_at: string; user_id: string;
  author: { display_name: string | null; username: string | null } | null;
  article: { title: string; slug: string } | null;
  match: { id: string; home: { short_name: string | null; name: string } | null; away: { short_name: string | null; name: string } | null } | null;
};

export default async function Commentaires({ searchParams }: PageProps<"/studio/commentaires">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().replace(/[%,()]/g, "") : "";
  const ou = typeof sp.ou === "string" ? sp.ou : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const db = await createClient();
  let req = db.from("comments")
    .select("id, body, created_at, user_id, author:profiles(display_name, username), article:articles(title, slug), match:matches(id, home:teams!matches_home_team_id_fkey(short_name,name), away:teams!matches_away_team_id_fkey(short_name,name))", { count: "exact" })
    .order("created_at", { ascending: false }).range((page - 1) * PAR_PAGE, page * PAR_PAGE - 1);
  if (q) req = req.ilike("body", `%${q}%`);
  if (ou === "articles") req = req.not("article_id", "is", null);
  if (ou === "matchs") req = req.not("match_id", "is", null);
  const { data, count } = await req;
  const coms = (data ?? []) as unknown as Com[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAR_PAGE));
  const back = `/studio/commentaires?${new URLSearchParams({ ...(q && { q }), ...(ou && { ou }), ...(page > 1 && { page: String(page) }) })}`;
  const lien = (p: number) => `/studio/commentaires?${new URLSearchParams({ ...(q && { q }), ...(ou && { ou }), page: String(p) })}`;

  return (
    <div>
      <PageHeader titre="Commentaires" description="Tous les commentaires du site, du plus récent au plus ancien. Cochez-en plusieurs pour les supprimer d'un coup ; pour un membre qui abuse, ouvrez sa fiche et suspendez-le." />
      <Notice sp={sp} />
      <form method="get" role="search" className="flex flex-wrap items-end gap-2 mb-4">
        <label className="grid gap-1 text-sm font-semibold">Contient
          <input name="q" defaultValue={q} placeholder="Un mot, une insulte…" className="champ w-64" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Où
          <select name="ou" defaultValue={ou} className="champ">
            <option value="">Partout</option>
            <option value="articles">Articles</option>
            <option value="matchs">Matchs</option>
          </select>
        </label>
        <button className="bouton-discret">Filtrer</button>
      </form>
      <p className="text-sm text-sourdine mb-2 tnum">{count ?? 0} commentaire{(count ?? 0) > 1 ? "s" : ""}{pages > 1 ? `, page ${page} sur ${pages}` : ""}</p>

      <form action={supprimerCommentaires}>
        <input type="hidden" name="_back" value={back} />
        <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait">
          {coms.map((c) => (
            <li key={c.id} className="p-3 flex gap-3 items-start">
              <input type="checkbox" name="ids" value={c.id} aria-label="Sélectionner ce commentaire" className="mt-1" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link href={`/studio/utilisateurs/${c.user_id}`} className="font-semibold hover:underline underline-offset-4">{c.author?.display_name ?? c.author?.username ?? "Anonyme"}</Link>
                  <span className="text-sourdine"> {fmtRelative(c.created_at)}, sur </span>
                  {c.article ? <Link href={`/actus/${c.article.slug}`} className="underline underline-offset-2">{c.article.title}</Link>
                    : c.match ? <Link href={`/matchs/${c.match.id}`} className="underline underline-offset-2">{c.match.home?.short_name ?? c.match.home?.name} – {c.match.away?.short_name ?? c.match.away?.name}</Link> : "–"}
                </p>
                <p className="text-sm mt-1 whitespace-pre-line">{c.body}</p>
              </div>
            </li>
          ))}
          {!coms.length && <li className="p-6 text-sourdine">Aucun commentaire.</li>}
        </ul>
        {coms.length > 0 && <button className="mt-4 rounded-full bg-alerte text-white px-4 py-2 text-sm font-semibold">Supprimer la sélection</button>}
      </form>
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex gap-2">
          {page > 1 && <Link href={lien(page - 1)} className="bouton-discret">Précédent</Link>}
          {page < pages && <Link href={lien(page + 1)} className="bouton-discret">Suivant</Link>}
        </nav>
      )}
    </div>
  );
}

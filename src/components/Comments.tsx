import Link from "next/link";
import { deleteComment } from "@/app/actions";
import { getComments } from "@/lib/queries";
import { getViewer, hasBadge } from "@/lib/supabase/server";
import { fmtRelative } from "@/lib/format";
import CommentForm from "./CommentForm";

export default async function Comments({ articleId, matchId, path }: { articleId?: string; matchId?: string; path: string }) {
  const [comments, viewer] = await Promise.all([getComments({ articleId, matchId }), getViewer()]);
  const staff = viewer && viewer.role !== "user";
  return (
    <section aria-labelledby="commentaires" className="mt-12 max-w-2xl">
      <h2 id="commentaires" className="text-xl font-bold">
        {comments.length === 0 ? "Commentaires" : `${comments.length} commentaire${comments.length > 1 ? "s" : ""}`}
      </h2>
      {viewer ? (
        <CommentForm articleId={articleId} matchId={matchId} path={path} />
      ) : (
        <p className="mt-3 text-sourdine">
          <Link href={`/connexion?suite=${encodeURIComponent(path)}`} className="text-vin font-semibold underline underline-offset-4">Connectez-vous</Link> pour donner votre avis.
        </p>
      )}
      <ul className="mt-6 grid gap-5">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            {c.author?.avatar_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={c.author.avatar_url} alt="" className={`w-9 h-9 shrink-0 rounded-full object-cover ${hasBadge(c.author) ? "ring-2 ring-moutarde" : ""}`} />
              : <span className={`w-9 h-9 shrink-0 rounded-full grid place-items-center titre font-bold ${hasBadge(c.author) ? "bg-moutarde text-bordeaux" : "bg-teinte text-vin"}`}>
                  {(c.author?.display_name ?? "?").slice(0, 1).toUpperCase()}
                </span>}
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                {c.author?.username && c.author.profil_public !== false
                  ? <Link href={`/membres/${c.author.username}`} className="font-semibold hover:underline underline-offset-4">{c.author.display_name ?? c.author.username}</Link>
                  : <span className="font-semibold">{c.author?.display_name ?? c.author?.username ?? "Supporter"}</span>}
                {hasBadge(c.author) && <span className="ml-1.5 text-[10px] font-bold rounded-full bg-moutarde text-bordeaux px-1.5 py-0.5 align-middle">Supporter</span>}
                <span className="text-sourdine">, {fmtRelative(c.created_at)}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-line break-words">{c.body}</p>
              {(viewer?.id === c.user_id || staff) && (
                <form action={deleteComment} className="mt-1">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="path" value={path} />
                  <button className="text-xs text-sourdine hover:text-alerte underline underline-offset-2">Supprimer</button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

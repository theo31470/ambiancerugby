"use client";
import { useActionState, useEffect, useRef } from "react";
import { addComment } from "@/app/actions";

export default function CommentForm({ articleId, matchId, path }: { articleId?: string; matchId?: string; path: string }) {
  const [state, action, pending] = useActionState(addComment, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="mt-3 grid gap-2">
      {articleId && <input type="hidden" name="article_id" value={articleId} />}
      {matchId && <input type="hidden" name="match_id" value={matchId} />}
      <input type="hidden" name="path" value={path} />
      <label htmlFor="body" className="sr-only">Votre commentaire</label>
      <textarea id="body" name="body" rows={3} maxLength={2000} required className="champ" placeholder="Votre avis sur le match, l'arbitrage, la troisième mi-temps…" />
      <div className="flex items-center gap-3">
        <button className="bouton" disabled={pending}>{pending ? "Publication…" : "Publier"}</button>
        {state?.error && <p role="alert" className="text-sm text-alerte">{state.error}</p>}
      </div>
    </form>
  );
}

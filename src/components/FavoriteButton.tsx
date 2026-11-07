import { toggleFavorite } from "@/app/actions";
import { createClient, getViewer } from "@/lib/supabase/server";

export default async function FavoriteButton({ kind, id, path }: { kind: "team" | "player"; id: string; path: string }) {
  const viewer = await getViewer();
  let on = false;
  if (viewer) {
    const supabase = await createClient();
    const table = kind === "team" ? "favorite_teams" : "favorite_players";
    const col = kind === "team" ? "team_id" : "player_id";
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("user_id", viewer.id).eq(col, id);
    on = (count ?? 0) > 0;
  }
  return (
    <form action={toggleFavorite}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="path" value={path} />
      <input type="hidden" name="on" value={on ? "1" : "0"} />
      <button type="submit" aria-pressed={on} className={on ? "bouton" : "bouton-discret"}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" strokeLinejoin="round" />
        </svg>
        {on ? "Suivi" : "Suivre"}
      </button>
    </form>
  );
}

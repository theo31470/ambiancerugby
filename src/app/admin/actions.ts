"use server";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { createClient, getViewer } from "@/lib/supabase/server";
import { EVENT_POINTS, parisLocalToIso, slugify } from "@/lib/format";

/** Exécute une action ; en cas d'erreur, revient sur la page du formulaire avec le message. */
async function run(form: FormData, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    unstable_rethrow(e);
    const back = String(form.get("_back") ?? "/admin");
    const msg = e instanceof Error ? e.message : "Erreur inattendue.";
    redirect(`${back}${back.includes("?") ? "&" : "?"}erreur=${encodeURIComponent(msg)}`);
  }
}

async function staff() {
  const viewer = await getViewer();
  if (!viewer || viewer.role === "user") throw new Error("Accès réservé à la rédaction.");
  return { viewer, db: await createClient() };
}

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  if (v == null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function fail(error: { message: string; code?: string } | null, what: string) {
  if (!error) return;
  if (error.code === "23505") throw new Error(`${what} : cette adresse (slug) existe déjà, choisissez-en une autre.`);
  throw new Error(`${what} : ${error.message}`);
}

/** Envoie une image dans le stockage "media" et renvoie son URL publique. */
async function upload(db: Awaited<ReturnType<typeof createClient>>, file: FormDataEntryValue | null, folder: string) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 4 * 1024 * 1024) throw new Error("Image trop lourde : 4 Mo maximum.");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await db.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Envoi de l'image : ${error.message}`);
  return db.storage.from("media").getPublicUrl(path).data.publicUrl;
}

// ---------------- Articles ----------------
export async function saveArticle(form: FormData) {
  return run(form, async () => {
    const { viewer, db } = await staff();
    const id = str(form, "id");
    const title = str(form, "title");
    if (!title) throw new Error("Le titre est obligatoire.");
    const status = form.get("status") === "published" ? "published" : "draft";
    const cover = (await upload(db, form.get("cover_file"), "articles")) ?? str(form, "cover_url");
    const publishedLocal = str(form, "published_at");
    const row = {
      title,
      slug: slugify(str(form, "slug") ?? title),
      excerpt: str(form, "excerpt"),
      content: String(form.get("content") ?? ""),
      category: str(form, "category") ?? "actu",
      competition_id: str(form, "competition_id"),
      team_id: str(form, "team_id"),
      cover_url: cover,
      status,
      published_at: publishedLocal ? parisLocalToIso(publishedLocal) : status === "published" ? new Date().toISOString() : null,
    };
    if (id) {
      const { error } = await db.from("articles").update(row).eq("id", id);
      fail(error, "Enregistrement de l'article");
    } else {
      const { error } = await db.from("articles").insert({ ...row, author_id: viewer.id });
      fail(error, "Création de l'article");
    }
    revalidatePath("/", "layout");
    redirect(`/admin/articles?ok=${status === "published" ? "publie" : "brouillon"}`);
  });
}

export async function deleteArticle(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const { error } = await db.from("articles").delete().eq("id", String(form.get("id")));
    fail(error, "Suppression");
    revalidatePath("/", "layout");
    redirect("/admin/articles?ok=supprime");
  });
}

// ---------------- Clubs ----------------
export async function saveTeam(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const id = str(form, "id");
    const name = str(form, "name");
    if (!name) throw new Error("Le nom est obligatoire.");
    const logo = (await upload(db, form.get("logo_file"), "logos")) ?? str(form, "logo_url");
    const row = {
      name,
      slug: slugify(str(form, "slug") ?? name),
      short_name: str(form, "short_name"),
      abbreviation: str(form, "abbreviation")?.toUpperCase() ?? null,
      aliases: (str(form, "aliases") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      city: str(form, "city"),
      country: str(form, "country"),
      stadium: str(form, "stadium"),
      founded: num(form, "founded"),
      color: str(form, "color"),
      logo_url: logo,
      description: str(form, "description"),
      is_national: form.get("is_national") === "on",
    };
    let teamId = id;
    if (id) {
      const { error } = await db.from("teams").update(row).eq("id", id);
      fail(error, "Enregistrement du club");
    } else {
      const { data, error } = await db.from("teams").insert(row).select("id").single();
      fail(error, "Création du club");
      teamId = data!.id;
    }
    // compétitions de la saison en cours
    const wanted = form.getAll("competitions").map(String);
    const { data: comps } = await db.from("competitions").select("id,current_season");
    for (const c of comps ?? []) {
      if (wanted.includes(c.id)) {
        await db.from("team_competitions").upsert({ team_id: teamId, competition_id: c.id, season: c.current_season }, { onConflict: "team_id,competition_id,season", ignoreDuplicates: true });
      } else {
        await db.from("team_competitions").delete().eq("team_id", teamId!).eq("competition_id", c.id).eq("season", c.current_season);
      }
    }
    revalidatePath("/", "layout");
    redirect("/admin/clubs?ok=enregistre");
  });
}

// ---------------- Joueurs ----------------
export async function savePlayer(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const id = str(form, "id");
    const first = str(form, "first_name");
    const last = str(form, "last_name");
    if (!first || !last) throw new Error("Prénom et nom sont obligatoires.");
    const photo = (await upload(db, form.get("photo_file"), "joueurs")) ?? str(form, "photo_url");
    const row = {
      first_name: first,
      last_name: last,
      slug: slugify(str(form, "slug") ?? `${first} ${last}`),
      team_id: str(form, "team_id"),
      position: str(form, "position"),
      number: num(form, "number"),
      nationality: str(form, "nationality"),
      birth_date: str(form, "birth_date"),
      height_cm: num(form, "height_cm"),
      weight_kg: num(form, "weight_kg"),
      caps: num(form, "caps"),
      career_points: num(form, "career_points"),
      career_tries: num(form, "career_tries"),
      photo_url: photo,
      bio: str(form, "bio"),
    };
    if (id) {
      const { error } = await db.from("players").update(row).eq("id", id);
      fail(error, "Enregistrement du joueur");
    } else {
      const { error } = await db.from("players").insert(row);
      fail(error, "Création du joueur");
    }
    revalidatePath("/", "layout");
    redirect(`/admin/joueurs?ok=enregistre${row.team_id ? `&club=${row.team_id}` : ""}`);
  });
}

export async function deletePlayer(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const { error } = await db.from("players").delete().eq("id", String(form.get("id")));
    fail(error, "Suppression");
    revalidatePath("/", "layout");
    redirect("/admin/joueurs?ok=supprime");
  });
}

// ---------------- Matchs ----------------
export async function saveMatch(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const id = str(form, "id");
    const kickoff = str(form, "kickoff_at");
    const competitionId = str(form, "competition_id");
    const home = str(form, "home_team_id");
    const away = str(form, "away_team_id");
    if (!kickoff || !competitionId || !home || !away) throw new Error("Compétition, équipes et coup d'envoi sont obligatoires.");
    if (home === away) throw new Error("Choisissez deux équipes différentes.");
    const { data: comp } = await db.from("competitions").select("current_season").eq("id", competitionId).single();
    const row = {
      competition_id: competitionId,
      season: str(form, "season") ?? comp?.current_season ?? "",
      round: str(form, "round"),
      kickoff_at: parisLocalToIso(kickoff),
      home_team_id: home,
      away_team_id: away,
      home_score: num(form, "home_score"),
      away_score: num(form, "away_score"),
      home_tries: num(form, "home_tries"),
      away_tries: num(form, "away_tries"),
      status: str(form, "status") ?? "scheduled",
      clock: str(form, "clock"),
      venue: str(form, "venue"),
      tv: str(form, "tv"),
    };
    let matchId = id;
    if (id) {
      const { error } = await db.from("matches").update(row).eq("id", id);
      fail(error, "Enregistrement du match");
    } else {
      const { data, error } = await db.from("matches").insert(row).select("id").single();
      fail(error, "Création du match");
      matchId = data!.id;
    }
    revalidatePath("/", "layout");
    redirect(`/admin/matchs/${matchId}?ok=enregistre`);
  });
}

export async function deleteMatch(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const { error } = await db.from("matches").delete().eq("id", String(form.get("id")));
    fail(error, "Suppression");
    revalidatePath("/", "layout");
    redirect("/admin/matchs?ok=supprime");
  });
}

/** Saisie express pendant le match : ajoute le fait de jeu et met le score à jour. */
export async function addEvent(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const matchId = String(form.get("match_id"));
    const kind = String(form.get("kind"));
    const teamId = str(form, "team_id");
    const { data: m, error } = await db.from("matches").select("*").eq("id", matchId).single();
    fail(error, "Match introuvable");
    const { error: e2 } = await db.from("match_events").insert({
      match_id: matchId, kind, team_id: teamId, player_id: str(form, "player_id"), minute: num(form, "minute"), text: str(form, "text"),
    });
    fail(e2, "Ajout du fait de jeu");
    const pts = EVENT_POINTS[kind] ?? 0;
    if (teamId && (pts || kind === "try" || kind === "penalty_try")) {
      const side = teamId === m!.home_team_id ? "home" : "away";
      const isTry = kind === "try" || kind === "penalty_try";
      const patch: Record<string, unknown> = {
        [`${side}_score`]: (m![`${side}_score`] ?? 0) + pts,
        ...(isTry ? { [`${side}_tries`]: (m![`${side}_tries`] ?? 0) + 1 } : {}),
      };
      // le score de l'adversaire passe de "vide" à 0
      const other = side === "home" ? "away" : "home";
      if (m![`${other}_score`] == null) patch[`${other}_score`] = 0;
      if (m!.status === "scheduled") patch.status = "live";
      const minute = num(form, "minute");
      if (minute != null) patch.clock = `${minute}'`;
      await db.from("matches").update(patch).eq("id", matchId);
    }
    revalidatePath("/", "layout");
    redirect(`/admin/matchs/${matchId}`);
  });
}

export async function deleteEvent(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const matchId = String(form.get("match_id"));
    const { data: ev } = await db.from("match_events").select("*").eq("id", String(form.get("id"))).single();
    if (ev) {
      await db.from("match_events").delete().eq("id", ev.id);
      const pts = EVENT_POINTS[ev.kind] ?? 0;
      if (ev.team_id && pts) {
        const { data: m } = await db.from("matches").select("*").eq("id", matchId).single();
        if (m) {
          const side = ev.team_id === m.home_team_id ? "home" : "away";
          const isTry = ev.kind === "try" || ev.kind === "penalty_try";
          await db.from("matches").update({
            [`${side}_score`]: Math.max(0, (m[`${side}_score`] ?? 0) - pts),
            ...(isTry ? { [`${side}_tries`]: Math.max(0, (m[`${side}_tries`] ?? 0) - 1) } : {}),
          }).eq("id", matchId);
        }
      }
    }
    revalidatePath("/", "layout");
    redirect(`/admin/matchs/${matchId}`);
  });
}

export async function setMatchStatus(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const matchId = String(form.get("match_id"));
    const status = String(form.get("status"));
    const patch: Record<string, unknown> = { status, clock: str(form, "clock") };
    if (status === "live") {
      const { data: m } = await db.from("matches").select("home_score,away_score").eq("id", matchId).single();
      if (m?.home_score == null) patch.home_score = 0;
      if (m?.away_score == null) patch.away_score = 0;
    }
    if (status === "finished" || status === "halftime") patch.clock = null;
    const { error } = await db.from("matches").update(patch).eq("id", matchId);
    fail(error, "Changement de statut");
    revalidatePath("/", "layout");
    redirect(`/admin/matchs/${matchId}`);
  });
}

// ---------------- Données ----------------
export async function runSync(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const job = String(form.get("job"));
    const params: Record<string, unknown> = {};
    if (job === "apisports") {
      params.competition = String(form.get("competition"));
      params.year = Number(form.get("year"));
      if (!params.year) throw new Error("Indiquez l'année de début de la saison.");
    }
    const { error } = await db.rpc("trigger_sync", { p_job: job, p_params: params });
    fail(error, "Lancement de la synchronisation");
    redirect("/admin/donnees?ok=lance");
  });
}

export async function setCurrentSeason(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const { error } = await db.from("competitions").update({ current_season: String(form.get("season")).trim() }).eq("id", String(form.get("id")));
    fail(error, "Saison");
    revalidatePath("/", "layout");
    redirect("/admin/donnees?ok=saison");
  });
}

// ---------------- Utilisateurs ----------------
export async function setRole(form: FormData) {
  return run(form, async () => {
    const { viewer, db } = await staff();
    if (viewer.role !== "admin") throw new Error("Seul un administrateur peut changer les rôles.");
    const id = String(form.get("id"));
    if (id === viewer.id) throw new Error("Vous ne pouvez pas changer votre propre rôle.");
    const { error } = await db.from("profiles").update({ role: String(form.get("role")) }).eq("id", id);
    fail(error, "Changement de rôle");
    redirect("/admin/utilisateurs?ok=role");
  });
}

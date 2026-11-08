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
      premium: form.get("premium") === "on",
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
      photo_source: photo ? "Ambiance Rugby" : null,
      bio: str(form, "bio"),
      // corrigé à la main : la synchro automatique n'y touche plus
      verrou: true,
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
    if (job === "competition") params.slug = String(form.get("slug"));
    if (job === "history" && form.get("force") === "on") params.force = true;
    const { error } = await db.rpc("trigger_sync", { p_job: job, p_params: params });
    fail(error, "Lancement de la synchronisation");
    redirect(`${String(form.get("_back") ?? "/admin/donnees")}?ok=lance`);
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

// ---------------- Abonnements (attribués à la main tant que le paiement n'est pas branché) ----------------
export async function setPlan(form: FormData) {
  return run(form, async () => {
    const { viewer, db } = await staff();
    if (viewer.role !== "admin") throw new Error("Seul un administrateur peut gérer les abonnements.");
    const duree = String(form.get("duree") ?? "");
    if (!duree) throw new Error("Choisissez une formule.");
    let patch: Record<string, unknown>;
    if (duree === "free") patch = { plan: "free", plan_until: null };
    else if (duree === "0") patch = { plan: "supporter", plan_until: null };
    else {
      const d = new Date();
      d.setMonth(d.getMonth() + Number(duree));
      patch = { plan: "supporter", plan_until: d.toISOString() };
    }
    const { error } = await db.from("profiles").update(patch).eq("id", String(form.get("id")));
    fail(error, "Abonnement");
    revalidatePath("/", "layout");
    redirect("/admin/utilisateurs?ok=enregistre");
  });
}

// ---------------- Feuille de stats des joueurs ----------------
const STAT_FIELDS = ["minutes", "tries", "conversions", "penalty_goals", "drop_goals", "tackles", "missed_tackles", "carries", "metres", "line_breaks", "offloads", "turnovers_won", "penalties_conceded", "yellow", "red"] as const;

export async function saveStats(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const matchId = String(form.get("match_id"));
    const ids = form.getAll("player_id").map(String);
    const motm = String(form.get("motm") ?? "");
    const rows = [];
    const remove: string[] = [];
    for (const pid of ids) {
      const played = form.get(`${pid}:joue`) === "on";
      if (!played) { remove.push(pid); continue; }
      const row: Record<string, unknown> = { match_id: matchId, player_id: pid, team_id: String(form.get(`${pid}:team`)), motm: motm === pid };
      for (const f of STAT_FIELDS) {
        const v = Number(String(form.get(`${pid}:${f}`) ?? "").replace(",", "."));
        row[f] = Number.isFinite(v) && v >= 0 ? Math.round(v) : f === "minutes" ? 80 : 0;
      }
      rows.push(row);
    }
    if (rows.length) {
      const { error } = await db.from("player_match_stats").upsert(rows, { onConflict: "match_id,player_id" });
      fail(error, "Feuille de stats");
    }
    if (remove.length) await db.from("player_match_stats").delete().eq("match_id", matchId).in("player_id", remove);
    revalidatePath("/", "layout");
    redirect(`/admin/matchs/${matchId}/stats?ok=enregistre`);
  });
}

// ---------- saisie de journée ----------
const SAISIE = ["tries", "conversions", "penalty_goals", "drop_goals", "yellow", "red"] as const;

export async function saveJournee(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const matchId = String(form.get("match_id"));
    const lignes = new Map<string, Record<string, unknown>>();
    for (const cote of ["home", "away"]) {
      const teamId = String(form.get(`${cote}.team`));
      const n = Number(form.get(`${cote}.n`) ?? 0);
      for (let i = 0; i < n; i++) {
        const pid = str(form, `${cote}.${i}.p`);
        if (!pid) continue;
        const v: Record<string, number> = {};
        for (const f of SAISIE) {
          const x = num(form, `${cote}.${i}.${f}`);
          if (x != null && (x < 0 || x > 99)) throw new Error("Valeur impossible dans la saisie (entre 0 et 99).");
          v[f] = Math.round(x ?? 0);
        }
        const minutes = num(form, `${cote}.${i}.minutes`);
        if (minutes != null && (minutes < 0 || minutes > 120)) throw new Error("Les minutes jouées vont de 0 à 120.");
        // même joueur sur deux lignes : on additionne
        const prev = lignes.get(pid);
        if (prev) { for (const f of SAISIE) prev[f] = (prev[f] as number) + v[f]; if (minutes != null) prev.minutes = minutes; continue; }
        lignes.set(pid, { match_id: matchId, player_id: pid, team_id: teamId, ...v, ...(minutes != null ? { minutes: Math.round(minutes) } : {}) });
      }
    }
    const rows = [...lignes.values()];
    if (rows.length) {
      const { error } = await db.from("player_match_stats").upsert(rows, { onConflict: "match_id,player_id" });
      fail(error, "Saisie du match");
    }
    // lignes retirées
    let del = db.from("player_match_stats").delete().eq("match_id", matchId);
    if (rows.length) del = del.not("player_id", "in", `(${rows.map((r) => r.player_id).join(",")})`);
    const { error: e2 } = await del;
    fail(e2, "Saisie du match");
    revalidatePath("/", "layout");
    const back = String(form.get("_back"));
    const [chemin, ancre] = back.split("#");
    redirect(`${chemin}${chemin.includes("?") ? "&" : "?"}ok=enregistre${ancre ? `#${ancre}` : ""}`);
  });
}

// ---------- stats de départ de saison ----------
const BASE = ["games", "starts", "minutes", "tries", "conversions", "penalty_goals", "drop_goals", "yellow", "red"] as const;

export async function saveBase(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const competitionId = String(form.get("competition_id"));
    const season = String(form.get("season"));
    const ids = form.getAll("player_id").map(String);
    const rows = [];
    const vides: string[] = [];
    for (const pid of ids) {
      const v: Record<string, number> = {};
      let total = 0;
      for (const f of BASE) {
        const x = num(form, `${pid}:${f}`);
        if (x != null && x < 0) throw new Error("Les valeurs négatives ne sont pas acceptées.");
        v[f] = Math.round(x ?? 0);
        total += v[f];
      }
      if (total === 0) { vides.push(pid); continue; }
      rows.push({ player_id: pid, competition_id: competitionId, season, ...v, updated_at: new Date().toISOString() });
    }
    if (rows.length) {
      const { error } = await db.from("player_season_base").upsert(rows, { onConflict: "player_id,competition_id,season" });
      fail(error, "Stats de départ");
    }
    if (vides.length) await db.from("player_season_base").delete().eq("competition_id", competitionId).eq("season", season).in("player_id", vides);
    revalidatePath("/", "layout");
    const back = String(form.get("_back"));
    redirect(`${back}${back.includes("?") ? "&" : "?"}ok=enregistre`);
  });
}

/** Collage depuis un tableur : « Nom ; MJ ; Tit ; Min ; E ; T ; P ; D ; CJ ; CR » (tabulations, points-virgules ou virgules). */
export async function importBase(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const competitionId = String(form.get("competition_id"));
    const season = String(form.get("season"));
    const teamId = String(form.get("team_id"));
    const texte = String(form.get("texte") ?? "");
    const { data: effectif } = await db.from("players").select("id,first_name,last_name").eq("team_id", teamId);
    const cle = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, " ").trim();
    const trouver = (nom: string) => {
      const n = cle(nom);
      const liste = effectif ?? [];
      return liste.find((p) => cle(`${p.first_name} ${p.last_name}`) === n || cle(`${p.last_name} ${p.first_name}`) === n)
        ?? (liste.filter((p) => n.includes(cle(p.last_name)) && n.includes(cle(p.first_name).slice(0, 1))).length === 1 ? liste.find((p) => n.includes(cle(p.last_name)) && n.includes(cle(p.first_name).slice(0, 1))) : undefined)
        ?? (liste.filter((p) => cle(p.last_name) === n).length === 1 ? liste.find((p) => cle(p.last_name) === n) : undefined);
    };
    const rows = [];
    const inconnus: string[] = [];
    for (const brut of texte.split(/\r?\n/)) {
      const ligne = brut.trim();
      if (!ligne) continue;
      const cells = ligne.split(/\t|;|,(?=\s*\d)/).map((c) => c.trim());
      const nom = cells[0];
      const chiffres = cells.slice(1).map((c) => Number(c.replace(/[^\d]/g, "") || 0));
      if (!nom || !chiffres.length || /^nom|joueur/i.test(nom)) continue;
      const p = trouver(nom);
      if (!p) { inconnus.push(nom); continue; }
      const v = Object.fromEntries(BASE.map((f, i) => [f, chiffres[i] ?? 0]));
      rows.push({ player_id: p.id, competition_id: competitionId, season, ...v, updated_at: new Date().toISOString() });
    }
    if (rows.length) {
      const { error } = await db.from("player_season_base").upsert(rows, { onConflict: "player_id,competition_id,season" });
      fail(error, "Import des stats de départ");
    }
    revalidatePath("/", "layout");
    const back = String(form.get("_back"));
    const msg = inconnus.length ? `&erreur=${encodeURIComponent(`${rows.length} joueurs importés. Introuvables dans l'effectif : ${inconnus.slice(0, 12).join(", ")}${inconnus.length > 12 ? "…" : ""}`)}` : "&ok=importe";
    redirect(`${back}${back.includes("?") ? "" : "?"}${msg}`);
  });
}

// ---------- effectifs automatiques ----------
export async function runEffectifs(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const job = String(form.get("job"));
    const slug = str(form, "slug");
    // relecture complète : tous les clubs repassent dans la file, traités par petits lots toutes les 3 minutes
    if (job === "squads" && !slug && form.get("force") === "on") {
      const { error: e } = await db.from("teams").update({ squad_synced_at: null }).eq("is_national", false).not("squad_synced_at", "is", null);
      fail(e, "Relecture des effectifs");
    }
    const { error } = await db.rpc("trigger_effectifs", { p_job: job, p_params: slug ? { slugs: [slug], force: true } : {} });
    fail(error, "Mise à jour des effectifs");
    redirect(`${String(form.get("_back") ?? "/admin/donnees")}?ok=lance`);
  });
}

export async function setVerrou(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const { error } = await db.from("players").update({ verrou: form.get("verrou") === "1" }).eq("id", String(form.get("id")));
    fail(error, "Verrou du joueur");
    revalidatePath("/admin/joueurs");
    redirect(`${String(form.get("_back"))}${String(form.get("_back")).includes("?") ? "&" : "?"}ok=enregistre`);
  });
}

export async function toggleCompetition(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const { error } = await db.from("competitions").update({ active: form.get("active") === "1" }).eq("id", String(form.get("id")));
    fail(error, "Compétition");
    revalidatePath("/", "layout");
    redirect("/admin/donnees?ok=enregistre");
  });
}

export async function setWikiTitle(form: FormData) {
  return run(form, async () => {
    const { db } = await staff();
    const titre = str(form, "wiki_title");
    const id = String(form.get("id"));
    const { error } = await db.from("teams").update({ wiki_title: titre, squad_synced_at: null }).eq("id", id);
    fail(error, "Page Wikipédia");
    const { data: t } = await db.from("teams").select("slug").eq("id", id).single();
    if (titre && t) await db.rpc("trigger_effectifs", { p_job: "squads", p_params: { slugs: [t.slug], force: true } });
    redirect("/admin/donnees?ok=lance#effectifs");
  });
}

// ---------- saisie assistée par Claude ----------
const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function analyserMatch(form: FormData) {
  return run(form, async () => {
    const { db, viewer } = await staff();
    const { analyserFeuille, IA_MODELE, IA_PLAFOND_MOIS_USD } = await import("@/lib/ia");
    const matchId = String(form.get("match_id"));
    const back = String(form.get("_back"));
    const texte = str(form, "texte") ?? "";
    const fichier = form.get("image");
    let image: { type: string; base64: string } | null = null;
    if (fichier instanceof File && fichier.size > 0) {
      if (!TYPES_IMAGE.includes(fichier.type)) throw new Error("Image : formats JPEG, PNG, WebP ou GIF uniquement.");
      if (fichier.size > 4 * 1024 * 1024) throw new Error("Image trop lourde : 4 Mo maximum.");
      image = { type: fichier.type, base64: Buffer.from(await fichier.arrayBuffer()).toString("base64") };
    }
    if (!texte && !image) throw new Error("Collez un compte rendu ou ajoutez une photo de la feuille de match.");

    // plafond mensuel : aucune analyse au-delà
    const { data: depense } = await db.rpc("ia_depense_mois");
    if (Number(depense ?? 0) >= IA_PLAFOND_MOIS_USD) throw new Error("Plafond mensuel de la saisie assistée atteint : elle revient le 1er du mois.");

    const { data: m } = await db.from("matches").select(`id, home_score, away_score, home_team_id, away_team_id, home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name)`).eq("id", matchId).single();
    if (!m) throw new Error("Match introuvable.");
    const { data: joueurs } = await db.from("players").select("id, first_name, last_name, position, team_id").in("team_id", [m.home_team_id, m.away_team_id]).eq("in_squad", true).order("last_name");
    const refs = new Map<string, string>();
    const effectif = (teamId: string, prefixe: string) => (joueurs ?? []).filter((j) => j.team_id === teamId).map((j, i) => {
      const ref = `${prefixe}${i + 1}`;
      refs.set(ref, j.id);
      return { ref, nom: `${j.first_name} ${j.last_name}`.trim(), poste: j.position };
    });
    const effectifDom = effectif(m.home_team_id, "H");
    const effectifExt = effectif(m.away_team_id, "A");

    let r;
    try {
      r = await analyserFeuille({
        domicile: (m.home as unknown as { name: string }).name, exterieur: (m.away as unknown as { name: string }).name,
        scoreDom: m.home_score, scoreExt: m.away_score, effectifDom, effectifExt, texte, image,
      });
    } catch (e) {
      await db.from("ia_usage").insert({ user_id: viewer.id, match_id: matchId, model: IA_MODELE, ok: false, message: (e as Error).message.slice(0, 300) });
      throw e;
    }
    await db.from("ia_usage").insert({ user_id: viewer.id, match_id: matchId, model: IA_MODELE, input_tokens: r.inputTokens, output_tokens: r.outputTokens, cost_usd: r.coutUsd });

    // on traduit les références en joueurs ; le reste est signalé
    const lignes = r.lignes.filter((l) => l.ref && refs.has(l.ref) && (l.ref.startsWith("H") ? l.equipe === "home" : l.equipe === "away"))
      .map((l) => ({ cote: l.equipe, player_id: refs.get(l.ref!)!, tries: l.essais, conversions: l.transformations, penalty_goals: l.penalites, drop_goals: l.drops, yellow: l.cartons_jaunes, red: l.cartons_rouges }));
    const inconnus = r.lignes.filter((l) => !l.ref || !refs.has(l.ref)).map((l) => ({ cote: l.equipe, nom: l.nom_lu, essais: l.essais, transformations: l.transformations, penalites: l.penalites, drops: l.drops, cj: l.cartons_jaunes, cr: l.cartons_rouges }));
    const { data: prop, error } = await db.from("ia_propositions").insert({ match_id: matchId, created_by: viewer.id, lignes, inconnus, remarques: r.remarques || null }).select("id").single();
    fail(error, "Proposition de Claude");
    const [chemin, ancre] = back.split("#");
    redirect(`${chemin}${chemin.includes("?") ? "&" : "?"}ia=${prop!.id}${ancre ? `#${ancre}` : ""}`);
  });
}

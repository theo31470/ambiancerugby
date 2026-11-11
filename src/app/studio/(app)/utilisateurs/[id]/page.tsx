import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getViewer } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { saveMembre, setAbonnement, setRole, supprimerCommentaire, supprimerMembre, suspendreMembre } from "../../actions";
import { ROLES } from "@/lib/admin";
import { fmtDate, fmtRelative } from "@/lib/format";

type Commentaire = { id: string; body: string; created_at: string; article_id: string | null; match_id: string | null };

export default async function FicheMembre({ params, searchParams }: PageProps<"/studio/utilisateurs/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return <p className="text-sourdine">Réservé aux administrateurs.</p>;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await createClient();
  const [{ data: profil }, { data: auth }, { data: teams }, { data: coms }, { data: envie }] = await Promise.all([
    db.from("profiles").select("*").eq("id", id).maybeSingle(),
    db.rpc("admin_membre", { p_id: id }),
    db.from("teams").select("id,name").order("name"),
    db.from("comments").select("id,body,created_at,article_id,match_id").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
    db.from("subscription_interest").select("created_at").eq("user_id", id).maybeSingle(),
  ]);
  if (!profil) notFound();
  const a = ((auth ?? []) as { email: string; email_confirmed_at: string | null; last_sign_in_at: string | null; created_at: string }[])[0];
  const back = `/studio/utilisateurs/${id}`;
  const soi = id === viewer.id;
  const suspendu = profil.suspended_until && new Date(profil.suspended_until) > new Date();
  const supporter = profil.plan !== "free" && (!profil.plan_until || new Date(profil.plan_until) > new Date());

  return (
    <div>
      <Link href="/studio/utilisateurs" className="text-sm text-sourdine underline underline-offset-4">Tous les membres</Link>
      <div className="mt-2">
        <PageHeader titre={profil.display_name ?? "Sans nom"}
          description={<>
            {a?.email}{profil.username ? ` · @${profil.username}` : ""}<br />
            Inscrit le {fmtDate(profil.created_at)}, dernière visite {a?.last_sign_in_at ? fmtRelative(a.last_sign_in_at) : "jamais"}
            {a && !a.email_confirmed_at ? ", e-mail non confirmé" : ""}
          </>}
          actions={<div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-teinte px-3 py-1 text-sm font-semibold">{ROLES[profil.role]}</span>
            {supporter && <span className="rounded-full bg-moutarde text-bordeaux px-3 py-1 text-sm font-bold">Supporter</span>}
            {suspendu && <span className="rounded-full bg-alerte/15 text-alerte px-3 py-1 text-sm font-bold">Suspendu</span>}
          </div>} />
      </div>
      <Notice sp={sp} />

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="h-profil" className="bg-surface border border-trait rounded-2xl p-5">
          <h2 id="h-profil" className="font-bold text-lg mb-3">Profil</h2>
          <form action={saveMembre} className="grid gap-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="_back" value={back} />
            <label className="grid gap-1 text-sm font-semibold">Nom affiché
              <input name="display_name" defaultValue={profil.display_name ?? ""} className="champ" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">Pseudo
              <input name="username" defaultValue={profil.username ?? ""} className="champ" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">Club favori
              <select name="favorite_team_id" defaultValue={profil.favorite_team_id ?? ""} className="champ">
                <option value="">Aucun</option>
                {(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">Note interne <span className="font-normal text-sourdine">(visible seulement des administrateurs)</span>
              <textarea name="admin_note" rows={3} defaultValue={profil.admin_note ?? ""} className="champ" />
            </label>
            <div><button className="bouton">Enregistrer le profil</button></div>
          </form>
        </section>

        <div className="grid gap-6 content-start">
          <section aria-labelledby="h-abo" className="bg-surface border border-trait rounded-2xl p-5">
            <h2 id="h-abo" className="font-bold text-lg">Abonnement</h2>
            {envie && !supporter && <p className="text-sm text-vin mt-1">A demandé à être prévenu de l&apos;ouverture de l&apos;abonnement le {fmtDate(envie.created_at)}.</p>}
            <form action={setAbonnement} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="_back" value={back} />
              <label className="grid gap-1 text-sm font-semibold">Formule
                <select name="plan" defaultValue={supporter ? "supporter" : "free"} className="champ">
                  <option value="free">Gratuit</option>
                  <option value="supporter">Supporter</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">Jusqu&apos;au <span className="font-normal text-sourdine">(vide = sans fin)</span>
                <input type="date" name="plan_until" defaultValue={profil.plan_until ? profil.plan_until.slice(0, 10) : ""} className="champ" />
              </label>
              <button className="bouton-discret">Appliquer</button>
            </form>
          </section>

          <section aria-labelledby="h-role" className="bg-surface border border-trait rounded-2xl p-5">
            <h2 id="h-role" className="font-bold text-lg">Rôle</h2>
            <p className="text-sm text-sourdine mt-1">Rédacteur : articles, matchs, clubs et joueurs. Administrateur : tout, y compris les membres.</p>
            {soi ? <p className="mt-3 text-sm font-semibold">C&apos;est votre compte : votre rôle ne peut pas être changé ici.</p> : (
              <form action={setRole} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="_back" value={back} />
                <select name="role" defaultValue={profil.role} aria-label="Rôle" className="champ">
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="bouton-discret">Changer le rôle</button>
              </form>
            )}
          </section>

          {!soi && (
            <section aria-labelledby="h-susp" className="bg-surface border border-trait rounded-2xl p-5">
              <h2 id="h-susp" className="font-bold text-lg">Suspension</h2>
              <p className="text-sm text-sourdine mt-1">{suspendu ? `Suspendu jusqu'au ${fmtDate(profil.suspended_until!)}. Il ne peut plus commenter.` : "Un membre suspendu ne peut plus commenter."}</p>
              <form action={suspendreMembre} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="_back" value={back} />
                <select name="jours" aria-label="Durée" className="champ" defaultValue={suspendu ? "lever" : "7"}>
                  <option value="1">24 heures</option>
                  <option value="7">7 jours</option>
                  <option value="30">30 jours</option>
                  <option value="toujours">Définitivement</option>
                  {suspendu && <option value="lever">Lever la suspension</option>}
                </select>
                <button className="bouton-discret">Appliquer</button>
              </form>
            </section>
          )}
        </div>
      </div>

      <section aria-labelledby="h-coms" className="mt-8">
        <h2 id="h-coms" className="font-bold text-lg mb-3">Ses commentaires ({(coms ?? []).length})</h2>
        {(coms ?? []).length ? (
          <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait">
            {((coms ?? []) as Commentaire[]).map((c) => (
              <li key={c.id} className="p-3 flex gap-3 items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-sourdine">{fmtRelative(c.created_at)}{c.match_id && <> · <Link href={`/matchs/${c.match_id}`} className="underline">voir le match</Link></>}</p>
                  <p className="text-sm mt-0.5">{c.body}</p>
                </div>
                <form action={supprimerCommentaire}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="_back" value={back} />
                  <button className="text-xs font-semibold text-alerte hover:underline">Supprimer</button>
                </form>
              </li>
            ))}
          </ul>
        ) : <p className="text-sourdine">Aucun commentaire.</p>}
      </section>

      {!soi && (
        <section aria-labelledby="h-danger" className="mt-8 border-2 border-alerte/40 rounded-2xl p-5">
          <h2 id="h-danger" className="font-bold text-lg text-alerte">Supprimer le compte</h2>
          <p className="text-sm mt-1">Le compte, le profil, les favoris et les commentaires sont supprimés définitivement. Impossible de revenir en arrière.</p>
          <form action={supprimerMembre} className="mt-3 flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="_back" value={back} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirme" /> Je confirme la suppression définitive</label>
            <button className="rounded-full bg-alerte text-white px-4 py-2 text-sm font-semibold">Supprimer ce compte</button>
          </form>
        </section>
      )}
    </div>
  );
}

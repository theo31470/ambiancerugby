import Link from "next/link";
import { urlMatch } from "@/lib/seo";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import Pronostic from "@/components/pronos/Pronostic";
import { CreerLigue, RejoindreLigue } from "@/components/pronos/FormsLigue";
import TableauClassement from "@/components/pronos/TableauClassement";
import { createClient, getViewer, publicClient } from "@/lib/supabase/server";
import { MATCH_SELECT } from "@/lib/queries";
import { fmtDay, fmtTime } from "@/lib/format";
import type { MatchFull } from "@/lib/types";

export const metadata: Metadata = { title: "Pronos : pronostics et ligues entre potes" };
export const dynamic = "force-dynamic";

const VUES = [
  { id: "a-venir", label: "À pronostiquer" },
  { id: "resultats", label: "Mes résultats" },
  { id: "classement", label: "Classement" },
  { id: "ligues", label: "Mes ligues" },
];

export default async function PronosPage({ searchParams }: PageProps<"/pronos">) {
  const sp = await searchParams;
  const vue = VUES.find((v) => v.id === sp.vue)?.id ?? "a-venir";
  const viewer = await getViewer();
  return (
    <div>
      <h1 className="groovy text-5xl sm:text-6xl text-vin">Pronos</h1>
      <p className="mt-2 text-sourdine max-w-prose">
        Pronostiquez le score des grands matchs avant le coup d&apos;envoi. <b className="text-encre">3 points</b> pour le bon vainqueur, <b className="text-encre">+2</b> si l&apos;écart est bon à 5 points près, <b className="text-encre">+3</b> pour l&apos;écart exact, <b className="text-encre">+1</b> si le total de points est bon à 10 près.
      </p>
      <nav aria-label="Rubriques" className="defile-scroll mt-6 flex gap-1 border-b border-trait overflow-x-auto">
        {VUES.map((v) => (
          <Link key={v.id} href={`/pronos?vue=${v.id}`} aria-current={v.id === vue ? "page" : undefined}
            className={`shrink-0 px-4 py-2.5 font-semibold border-b-2 -mb-px ${v.id === vue ? "border-vin text-vin" : "border-transparent text-sourdine hover:text-encre"}`}>{v.label}</Link>
        ))}
        <Link href="/pronos/xv" className="shrink-0 px-4 py-2.5 font-semibold border-b-2 -mb-px border-transparent text-sourdine hover:text-encre">XV de la semaine</Link>
      </nav>
      <div className="mt-6">
        {vue === "a-venir" && <AVenir userId={viewer?.id ?? null} />}
        {vue === "resultats" && <Resultats userId={viewer?.id ?? null} />}
        {vue === "classement" && <Classement />}
        {vue === "ligues" && <Ligues userId={viewer?.id ?? null} supporter={!!viewer?.supporter} />}
      </div>
    </div>
  );
}

async function AVenir({ userId }: { userId: string | null }) {
  const db = publicClient();
  const sel = MATCH_SELECT.replace("competition:competitions(", "competition:competitions(niveau,");
  const { data } = await db.from("matches").select(sel).eq("status", "scheduled").gt("kickoff_at", new Date().toISOString())
    .lte("kickoff_at", new Date(Date.now() + 9 * 86400e3).toISOString()).order("kickoff_at").limit(120);
  const matchs = ((data ?? []) as unknown as (MatchFull & { competition: { niveau?: number } })[])
    .filter((m) => (m.competition.niveau ?? 0) >= 1500 || ["pro-d2", "challenge-cup"].includes(m.competition.slug));
  if (!matchs.length) return <Vide>Pas de grand match dans les 9 prochains jours. Revenez bientôt !</Vide>;
  let mes = new Map<string, { h: number; a: number }>();
  if (userId) {
    const { data: p } = await (await createClient()).from("pronos").select("match_id,home_score,away_score").eq("user_id", userId).in("match_id", matchs.map((m) => m.id));
    mes = new Map((p ?? []).map((x) => [x.match_id, { h: x.home_score, a: x.away_score }]));
  }
  const groupes = new Map<string, typeof matchs>();
  for (const m of matchs) { const k = fmtDay(m.kickoff_at, { weekday: "long", day: "numeric", month: "long" }); groupes.set(k, [...(groupes.get(k) ?? []), m]); }
  return (
    <div className="grid gap-6">
      {!userId && <p className="bg-teinte rounded-2xl p-4"><Link href="/connexion?suite=/pronos" className="font-semibold text-vin underline underline-offset-4">Connectez-vous</Link> pour enregistrer vos pronostics et entrer au classement.</p>}
      {[...groupes.entries()].map(([jour, liste]) => (
        <section key={jour}>
          <h2 className="font-bold mb-2 first-letter:uppercase">{jour}</h2>
          <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait">
            {liste.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <span className="w-24 shrink-0 text-xs text-sourdine"><span className="block font-semibold text-encre">{fmtTime(m.kickoff_at)}</span>{m.competition.short_name ?? m.competition.name}</span>
                <Link href={urlMatch(m)} className="flex-1 min-w-[12rem] grid gap-1 text-sm font-semibold hover:text-vin">
                  <span className="flex items-center gap-2"><TeamBadge team={m.home} size="xs" />{m.home.short_name ?? m.home.name}</span>
                  <span className="flex items-center gap-2"><TeamBadge team={m.away} size="xs" />{m.away.short_name ?? m.away.name}</span>
                </Link>
                <Pronostic matchId={m.id} initial={mes.get(m.id) ?? null} ferme={false} connecte={!!userId} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

async function Resultats({ userId }: { userId: string | null }) {
  if (!userId) return <Vide><Link href="/connexion?suite=/pronos?vue=resultats" className="text-vin font-semibold underline">Connectez-vous</Link> pour retrouver vos pronostics.</Vide>;
  const { data } = await (await createClient()).from("pronos")
    .select(`home_score,away_score,points, match:matches(${MATCH_SELECT.replace(/^\*, /, "id,kickoff_at,status,home_score,away_score, ")})`)
    .eq("user_id", userId).order("updated_at", { ascending: false }).limit(60);
  const rows = (data ?? []) as unknown as { home_score: number; away_score: number; points: number | null; match: MatchFull }[];
  if (!rows.length) return <Vide>Aucun pronostic pour l&apos;instant. Commencez par l&apos;onglet « À pronostiquer ».</Vide>;
  const total = rows.reduce((s, r) => s + (r.points ?? 0), 0);
  return (
    <div>
      <p className="mb-4"><span className="groovy text-4xl text-vin tnum">{total}</span> <span className="text-sourdine">points sur vos {rows.filter((r) => r.points != null).length} derniers matchs notés</span></p>
      <ul className="bg-surface border border-trait rounded-2xl divide-y divide-trait">
        {rows.sort((a, b) => +new Date(b.match.kickoff_at) - +new Date(a.match.kickoff_at)).map((r) => (
          <li key={r.match.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <Link href={urlMatch(r.match)} className="flex-1 min-w-[12rem] font-semibold hover:text-vin">{r.match.home.short_name ?? r.match.home.name} – {r.match.away.short_name ?? r.match.away.name}</Link>
            <span className="text-sourdine">Votre prono <b className="text-encre tnum">{r.home_score}-{r.away_score}</b></span>
            <span className="text-sourdine">Score <b className="text-encre tnum">{r.match.status === "finished" ? `${r.match.home_score}-${r.match.away_score}` : "à venir"}</b></span>
            <span className={`w-16 text-right titre font-extrabold tnum ${r.points == null ? "text-sourdine" : r.points >= 8 ? "text-vin" : ""}`}>{r.points == null ? "–" : `${r.points} pt${r.points > 1 ? "s" : ""}`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Classement() {
  return <div><p className="mb-3 text-sm text-sourdine">Classement général de la saison (membres au profil public).</p><TableauClassement /></div>;
}

async function Ligues({ userId, supporter }: { userId: string | null; supporter: boolean }) {
  if (!userId) return <Vide><Link href="/connexion?suite=/pronos?vue=ligues" className="text-vin font-semibold underline">Connectez-vous</Link> pour rejoindre une ligue entre potes.</Vide>;
  const { data } = await (await createClient()).from("prono_ligues").select("id,nom,code,owner_id, membres:prono_membres(count)").order("created_at");
  const ligues = (data ?? []) as unknown as { id: string; nom: string; code: string; owner_id: string; membres: { count: number }[] }[];
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        {ligues.length ? (
          <ul className="grid gap-3">
            {ligues.map((l) => (
              <li key={l.id}>
                <Link href={`/pronos/ligues/${l.id}`} className="carte-vie flex items-center gap-4 bg-surface border border-trait rounded-2xl p-4">
                  <span className="groovy text-2xl text-vin flex-1 truncate">{l.nom}</span>
                  <span className="text-sm text-sourdine">{l.membres[0]?.count ?? 1} membre{(l.membres[0]?.count ?? 1) > 1 ? "s" : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <Vide>Vous n&apos;êtes dans aucune ligue. Rejoignez celle de vos potes avec leur code, ou créez la vôtre.</Vide>}
      </div>
      <aside className="grid gap-4 content-start">
        <div className="bg-surface border border-trait rounded-2xl p-5">
          <h2 className="font-bold">Rejoindre une ligue</h2>
          <p className="text-sm text-sourdine mt-1">Entrez le code que vous a donné un ami.</p>
          <div className="mt-3"><RejoindreLigue /></div>
        </div>
        <div className="bg-surface border border-trait rounded-2xl p-5">
          <h2 className="font-bold">Créer ma ligue</h2>
          {supporter ? <div className="mt-3"><CreerLigue /></div> : (
            <p className="text-sm text-sourdine mt-1">La création de ligues est réservée aux Supporters. Vos amis, eux, la rejoignent gratuitement. <Link href="/abonnement" className="text-vin font-semibold underline underline-offset-4">Devenir Supporter</Link></p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Vide({ children }: { children: React.ReactNode }) {
  return <p className="bg-surface border border-trait rounded-2xl p-5 text-sourdine">{children}</p>;
}

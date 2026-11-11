/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import ChoixJoueur from "@/components/comparer/ChoixJoueur";
import { getViewer, publicClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Comparateur de joueurs" };
export const dynamic = "force-dynamic";

type Saison = { season: string; games: number; minutes: number; tries: number; points: number; tackles: number; carries: number; metres: number; line_breaks: number; turnovers_won: number; motm: number; rating: number | null };
type Fiche = { id: string; slug: string; first_name: string; last_name: string; photo_url: string | null; position: string | null; team: { short_name: string | null; name: string; slug: string } | null; saisons: Saison[] };

async function fiche(slug: string | null): Promise<Fiche | null> {
  if (!slug) return null;
  const db = publicClient();
  const { data: p } = await db.from("players").select("id,slug,first_name,last_name,photo_url,position, team:teams(short_name,name,slug)").eq("slug", slug).maybeSingle();
  if (!p) return null;
  const { data: s } = await db.from("player_season_stats").select("*").eq("player_id", p.id).order("season", { ascending: false });
  return { ...(p as unknown as Omit<Fiche, "saisons">), saisons: (s ?? []) as Saison[] };
}

const LIGNES: [keyof Saison, string, boolean][] = [
  ["games", "Matchs", false], ["tries", "Essais", true], ["points", "Points", true], ["tackles", "Plaquages", true],
  ["carries", "Courses", true], ["metres", "Mètres", true], ["line_breaks", "Franchissements", true], ["turnovers_won", "Ballons grattés", true], ["motm", "Homme du match", false],
];

function cumul(f: Fiche) {
  const t: Record<string, number> = {};
  for (const s of f.saisons) for (const [k] of LIGNES) t[k] = (t[k] ?? 0) + (Number(s[k]) || 0);
  t.minutes = f.saisons.reduce((x, s) => x + (s.minutes || 0), 0);
  const notes = f.saisons.filter((s) => s.rating != null);
  t.rating = notes.length ? notes.reduce((x, s) => x + Number(s.rating) * s.games, 0) / Math.max(1, notes.reduce((x, s) => x + s.games, 0)) : 0;
  return t;
}

export default async function Comparer({ searchParams }: PageProps<"/joueurs/comparer">) {
  const sp = await searchParams;
  const [a, b, viewer] = await Promise.all([fiche(typeof sp.a === "string" ? sp.a : null), fiche(typeof sp.b === "string" ? sp.b : null), getViewer()]);
  const full = !!viewer?.supporter;
  const ca = a ? cumul(a) : null, cb = b ? cumul(b) : null;
  const par80 = (t: Record<string, number>, k: string) => (t.minutes > 0 ? (t[k] / t.minutes) * 80 : 0);

  return (
    <div>
      <Link href="/joueurs" className="text-sm text-sourdine hover:text-vin">← Joueurs</Link>
      <h1 className="groovy text-5xl sm:text-6xl text-vin mt-2">Comparateur</h1>
      <p className="mt-2 text-sourdine">Deux joueurs côte à côte, sur toute la carrière et saison par saison.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ChoixJoueur cle="a" label="Joueur 1" actuel={a ? `${a.first_name} ${a.last_name}` : null} />
        <ChoixJoueur cle="b" label="Joueur 2" actuel={b ? `${b.first_name} ${b.last_name}` : null} />
      </div>

      {a && b && ca && cb && (
        <div className="mt-8 grid gap-8">
          <div className="grid grid-cols-2 gap-4">
            {[a, b].map((j, i) => (
              <Link key={j.id} href={`/joueurs/${j.slug}`} className={`flex items-center gap-3 rounded-2xl p-4 ${i === 0 ? "bg-bordeaux text-white" : "bg-moutarde text-bordeaux sm:flex-row-reverse sm:text-right"}`}>
                {j.photo_url ? <img src={j.photo_url} alt="" className="w-16 h-16 rounded-full object-cover object-top bg-white/20" /> : <span className="w-16 h-16 rounded-full bg-white/20" />}
                <span className="min-w-0"><span className="block groovy text-2xl truncate">{j.last_name}</span><span className="block text-sm opacity-75 truncate">{j.first_name} · {j.team?.short_name ?? j.team?.name ?? "Sans club"}{j.position ? ` · ${j.position}` : ""}</span></span>
              </Link>
            ))}
          </div>

          <section aria-labelledby="h-carriere">
            <h2 id="h-carriere" className="titre text-2xl font-extrabold mb-3">Sur toute la carrière suivie</h2>
            <div className="bg-surface border border-trait rounded-2xl p-4 grid gap-3">
              {[["rating", "Note moyenne", false] as const, ...LIGNES].map(([k, label, ratio]) => {
                const va = full && ratio ? par80(ca, k) : ca[k] ?? 0, vb = full && ratio ? par80(cb, k) : cb[k] ?? 0;
                const max = Math.max(va, vb, 0.0001);
                const f = (v: number) => (k === "rating" ? v.toFixed(1) : full && ratio ? v.toFixed(1) : Math.round(v).toLocaleString("fr-FR"));
                return (
                  <div key={k} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                    <span className="flex items-center justify-end gap-2"><b className={`tnum ${va > vb ? "text-vin" : ""}`}>{f(va)}</b><span className="h-3 rounded-full bg-vin" style={{ width: `${(va / max) * 100}%`, maxWidth: "70%" }} /></span>
                    <span className="w-32 text-center text-xs text-sourdine">{label}{full && ratio ? " /80 min" : ""}</span>
                    <span className="flex items-center gap-2"><span className="h-3 rounded-full bg-moutarde" style={{ width: `${(vb / max) * 100}%`, maxWidth: "70%" }} /><b className={`tnum ${vb > va ? "text-[color-mix(in_srgb,var(--moutarde)_60%,var(--encre))]" : ""}`}>{f(vb)}</b></span>
                  </div>
                );
              })}
            </div>
          </section>

          {full ? (
            <section aria-labelledby="h-saisons">
              <h2 id="h-saisons" className="titre text-2xl font-extrabold mb-3">Saison par saison</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {[a, b].map((j) => (
                  <div key={j.id} className="bg-surface border border-trait rounded-2xl overflow-x-auto">
                    <p className="px-4 pt-3 font-bold">{j.first_name} {j.last_name}</p>
                    <table className="w-full text-sm tnum">
                      <thead><tr className="text-xs text-sourdine border-b border-trait"><th className="text-left py-2 pl-4 font-semibold">Saison</th><th className="font-semibold">M</th><th className="font-semibold">E</th><th className="font-semibold">Pts</th><th className="font-semibold">Plaq.</th><th className="font-semibold pr-4">Note</th></tr></thead>
                      <tbody>{j.saisons.map((s) => (
                        <tr key={s.season} className="border-b border-trait last:border-0"><td className="py-1.5 pl-4">{s.season}</td><td className="text-center">{s.games}</td><td className="text-center">{s.tries}</td><td className="text-center">{s.points}</td><td className="text-center">{s.tackles}</td><td className="text-center pr-4 font-bold">{s.rating != null ? Number(s.rating).toFixed(1) : "–"}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <p className="rounded-2xl bg-teinte p-5">Les stats ramenées à 80 minutes et le détail saison par saison sont réservés aux Supporters. <Link href="/abonnement" className="text-vin font-semibold underline underline-offset-4">Devenir Supporter</Link></p>
          )}
        </div>
      )}
    </div>
  );
}

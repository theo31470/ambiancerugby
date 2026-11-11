/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { publicClient, hasBadge } from "@/lib/supabase/server";
import { gradeDe } from "@/lib/membres";
import TeamBadge from "@/components/TeamBadge";
import { fmtDate } from "@/lib/format";
import { JE_SUIS } from "@/lib/membres";

type Profil = { id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null; ville: string | null; je_suis: keyof typeof JE_SUIS | null; profil_public: boolean; plan: string; plan_until: string | null; role: string; created_at: string; club: { slug: string; name: string; short_name: string | null; logo_url: string | null; color: string | null; abbreviation: string | null; id: string } | null };

async function charger(pseudo: string) {
  const { data } = await publicClient().from("profiles")
    .select("id, username, display_name, avatar_url, bio, ville, je_suis, profil_public, plan, plan_until, role, created_at, supporter_grade, club:teams!profiles_fav_team_fk(id, slug, name, short_name, logo_url, color, abbreviation)")
    .ilike("username", decodeURIComponent(pseudo)).maybeSingle();
  return data as unknown as Profil | null;
}

export async function generateMetadata({ params }: PageProps<"/membres/[pseudo]">): Promise<Metadata> {
  const p = await charger((await params).pseudo);
  return { title: p?.profil_public ? `${p.display_name ?? p.username}, supporter` : "Membre", robots: { index: false } };
}

/** Page publique d'un membre : sa carte de supporter et ses derniers commentaires. */
export default async function PageMembre({ params }: PageProps<"/membres/[pseudo]">) {
  const p = await charger((await params).pseudo);
  if (!p || !p.profil_public) notFound();
  const { data: coms } = await publicClient().from("comments")
    .select("id, body, created_at, article:articles(slug, title), match:matches(id, home:teams!matches_home_team_id_fkey(short_name, name), away:teams!matches_away_team_id_fkey(short_name, name))")
    .eq("user_id", p.id).order("created_at", { ascending: false }).limit(8);
  const badge = hasBadge(p);
  const nom = p.display_name ?? p.username;
  return (
    <div className="max-w-3xl">
      <section className="relative rounded-[2rem] bg-bordeaux text-white p-6 sm:p-9 overflow-hidden">
        <div className="flex flex-wrap items-center gap-5">
          {p.avatar_url ? <img src={p.avatar_url} alt="" className={`w-24 h-24 rounded-full object-cover ${badge ? "ring-4 ring-moutarde" : "ring-4 ring-white/20"}`} />
            : <span className={`w-24 h-24 rounded-full grid place-items-center groovy text-5xl ${badge ? "bg-moutarde text-bordeaux" : "bg-white/15"}`}>{nom.slice(0, 1).toUpperCase()}</span>}
          <div className="min-w-0">
            <h1 className="groovy text-4xl sm:text-5xl break-words">{nom}</h1>
            <p className="mt-1 text-white/70">@{p.username}{p.ville ? `, ${p.ville}` : ""}</p>
            <p className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
              {badge && <span className="rounded-full bg-moutarde text-bordeaux px-2.5 py-1">{gradeDe((p as { supporter_grade?: number }).supporter_grade)}</span>}
              {p.role !== "user" && <span className="rounded-full bg-white/15 px-2.5 py-1">Rédaction</span>}
              {p.je_suis && <span className="rounded-full bg-white/15 px-2.5 py-1">{JE_SUIS[p.je_suis]}</span>}
            </p>
          </div>
        </div>
        {p.bio && <p className="mt-6 text-lg leading-relaxed max-w-prose">{p.bio}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/75">
          {p.club && <Link href={`/clubs/${p.club.slug}`} className="flex items-center gap-2 font-semibold text-white hover:underline underline-offset-4"><TeamBadge team={p.club} size="sm" />Club de cœur : {p.club.name}</Link>}
          <span>Membre depuis {fmtDate(p.created_at)}</span>
        </div>
      </section>
      <section aria-labelledby="h-coms" className="mt-10">
        <h2 id="h-coms" className="groovy text-3xl text-vin mb-4">En tribune</h2>
        {coms?.length ? (
          <ul className="grid gap-3">
            {coms.map((c) => {
              const a = c.article as unknown as { slug: string; title: string } | null;
              const m = c.match as unknown as { id: string; home: { short_name: string | null; name: string }; away: { short_name: string | null; name: string } } | null;
              const lien = a ? { href: `/actus/${a.slug}`, titre: a.title } : m ? { href: `/matchs/${m.id}`, titre: `${m.home.short_name ?? m.home.name} – ${m.away.short_name ?? m.away.name}` } : null;
              return (
                <li key={c.id} className="bg-surface border border-trait rounded-2xl p-4">
                  <p className="whitespace-pre-line">{c.body}</p>
                  <p className="mt-2 text-xs text-sourdine">{fmtDate(c.created_at)}{lien && <> sur <Link href={lien.href} className="underline underline-offset-2">{lien.titre}</Link></>}</p>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sourdine">{nom} n&apos;a pas encore pris la parole.</p>}
      </section>
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TeamBadge from "@/components/TeamBadge";
import FavoriteButton from "@/components/FavoriteButton";
import { getPlayer } from "@/lib/queries";
import { POSITIONS, age, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/joueurs/[slug]">): Promise<Metadata> {
  const p = await getPlayer((await params).slug);
  return p ? { title: `${p.first_name} ${p.last_name}` } : {};
}

export default async function JoueurPage({ params }: PageProps<"/joueurs/[slug]">) {
  const { slug } = await params;
  const p = await getPlayer(slug);
  if (!p) notFound();
  const a = age(p.birth_date);

  const facts: [string, string | null][] = [
    ["Poste", p.position ? POSITIONS[p.position] : null],
    ["Nationalité", p.nationality],
    ["Naissance", p.birth_date ? `${fmtDate(p.birth_date)}${a != null ? ` (${a} ans)` : ""}` : null],
    ["Taille", p.height_cm ? `${(p.height_cm / 100).toFixed(2).replace(".", ",")} m` : null],
    ["Poids", p.weight_kg ? `${p.weight_kg} kg` : null],
    ["Sélections", p.caps != null ? String(p.caps) : null],
    ["Essais en carrière", p.career_tries != null ? String(p.career_tries) : null],
    ["Points en carrière", p.career_points != null ? String(p.career_points) : null],
  ];

  return (
    <div className="grid gap-8 md:grid-cols-[16rem_1fr] md:gap-12">
      <div>
        {p.photo_url ? (
          <img src={p.photo_url} alt={`${p.first_name} ${p.last_name}`} className="w-full max-w-64 aspect-[4/5] object-cover rounded-lg" />
        ) : (
          <div className="w-full max-w-64 aspect-[4/5] rounded-lg bg-vin grid place-items-center" aria-hidden>
            <span className="titre text-white/90 text-7xl font-extrabold">{p.first_name.slice(0, 1)}{p.last_name.slice(0, 1)}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sourdine">{p.first_name}</p>
        <h1 className="text-4xl sm:text-6xl font-extrabold leading-none">{p.last_name}</h1>
        {p.team && (
          <Link href={`/clubs/${p.team.slug}`} className="mt-4 inline-flex items-center gap-2 font-semibold hover:underline underline-offset-4">
            <TeamBadge team={p.team} size="sm" />
            {p.team.name}
            {p.number != null && <span className="text-sourdine font-normal">, n° {p.number}</span>}
          </Link>
        )}
        <div className="mt-4"><FavoriteButton kind="player" id={p.id} path={`/joueurs/${p.slug}`} /></div>

        <dl className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 max-w-2xl">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="border-t border-trait pt-2">
              <dt className="text-sm text-sourdine">{k}</dt>
              <dd className="titre font-bold text-lg tnum">{v}</dd>
            </div>
          ))}
        </dl>

        {p.bio && <p className="mt-8 max-w-prose text-lg whitespace-pre-line">{p.bio}</p>}
      </div>
    </div>
  );
}

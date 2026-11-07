/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Markdown from "@/components/Markdown";
import Comments from "@/components/Comments";
import TeamBadge from "@/components/TeamBadge";
import { getArticle } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Pinte } from "@/components/deco/Icones";
import { CATEGORIES, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/actus/[slug]">): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.excerpt ?? undefined,
    openGraph: { type: "article", title: a.title, description: a.excerpt ?? undefined, images: a.cover_url ? [a.cover_url] : ["/og.jpg"] },
  };
}

export default async function ArticlePage({ params }: PageProps<"/actus/[slug]">) {
  const { slug } = await params;
  const a = await getArticle(slug, await createClient());
  if (!a) notFound();
  return (
    <article className="max-w-3xl">
      <p className="text-sm">
        {a.premium && <span className="mr-2 text-[11px] font-bold rounded-full bg-moutarde text-bordeaux px-2 py-0.5 align-middle">Exclusif Supporters</span>}
        <Link href={`/actus?rubrique=${a.category}`} className="text-vin font-semibold underline underline-offset-4">{CATEGORIES[a.category] ?? a.category}</Link>
        {a.competition && (
          <>
            <span className="text-sourdine">, </span>
            <Link href={`/competitions/${a.competition.slug}`} className="text-sourdine hover:underline underline-offset-4">{a.competition.name}</Link>
          </>
        )}
      </p>
      <h1 className="mt-3 text-4xl sm:text-6xl font-extrabold leading-[1.02]">{a.title}</h1>
      {a.excerpt && <p className="mt-4 text-xl text-sourdine max-w-prose">{a.excerpt}</p>}
      <p className="mt-4 text-sm text-sourdine">
        {a.author?.display_name ? `Par ${a.author.display_name}, ` : ""}
        {a.published_at && `publié le ${fmtDate(a.published_at)}`}
      </p>
      {a.cover_url && <img src={a.cover_url} alt="" className="mt-6 w-full rounded-lg aspect-[16/9] object-cover" />}
      <div className="mt-8 relative">
        <Markdown source={a.content} />
        {a.locked && (
          <>
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-fond" aria-hidden />
            <div className="relative mt-6 rounded-[1.5rem] bg-bordeaux text-white p-6 sm:p-8 text-center">
              <Pinte className="w-12 h-auto mx-auto text-bordeaux" />
              <p className="groovy text-3xl mt-3">La suite est en tribune d&apos;honneur</p>
              <p className="mt-2 text-white/80">Cet article est réservé aux Supporters d&apos;Ambiance Rugby.</p>
              <Link href="/abonnement" className="bouton-or mt-5">Devenir Supporter, 2,99 €/mois</Link>
            </div>
          </>
        )}
      </div>
      {a.team && (
        <Link href={`/clubs/${a.team.slug}`} className="mt-10 inline-flex items-center gap-2 bouton-discret">
          <TeamBadge team={a.team} size="xs" />
          Voir la fiche {a.team.short_name ?? a.team.name}
        </Link>
      )}
      <Comments articleId={a.id} path={`/actus/${a.slug}`} />
    </article>
  );
}

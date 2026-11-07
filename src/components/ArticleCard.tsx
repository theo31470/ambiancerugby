/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CATEGORIES, fmtRelative } from "@/lib/format";
import type { Article } from "@/lib/types";

function Cover({ a, className }: { a: Article; className: string }) {
  if (a.cover_url) return <img src={a.cover_url} alt="" loading="lazy" className={`${className} object-cover`} />;
  // pas de photo : un aplat aux couleurs du site avec l'initiale de la rubrique
  return (
    <div className={`${className} bg-vin grid place-items-center`} aria-hidden>
      <img src="/logo-blanc.png" alt="" className="w-2/5 opacity-25" />
    </div>
  );
}

export function ArticleHero({ a }: { a: Article }) {
  return (
    <Link href={`/actus/${a.slug}`} className="group block carte-vie">
      <Cover a={a} className="w-full aspect-[16/9] rounded-2xl" />
      <p className="mt-3 text-sm text-sourdine">
        {a.premium && <span className="mr-1.5 text-[10px] font-bold rounded-full bg-moutarde text-bordeaux px-1.5 py-0.5">Exclusif</span>}<span className="text-vin font-semibold">{CATEGORIES[a.category] ?? a.category}</span>
        {a.published_at && <span>, {fmtRelative(a.published_at)}</span>}
      </p>
      <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold leading-tight group-hover:underline underline-offset-4 decoration-2">{a.title}</h2>
      {a.excerpt && <p className="mt-2 text-sourdine max-w-prose">{a.excerpt}</p>}
    </Link>
  );
}

export default function ArticleCard({ a }: { a: Article }) {
  return (
    <Link href={`/actus/${a.slug}`} className="group flex gap-3 sm:gap-4 carte-vie rounded-xl">
      <Cover a={a} className="w-28 sm:w-36 aspect-[4/3] rounded-md shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-sourdine">
          {a.premium && <span className="mr-1.5 text-[10px] font-bold rounded-full bg-moutarde text-bordeaux px-1.5 py-0.5">Exclusif</span>}<span className="text-vin font-semibold">{CATEGORIES[a.category] ?? a.category}</span>
          {a.published_at && <span>, {fmtRelative(a.published_at)}</span>}
        </p>
        <h3 className="mt-0.5 font-bold leading-snug group-hover:underline underline-offset-4">{a.title}</h3>
        {a.excerpt && <p className="mt-1 text-sm text-sourdine line-clamp-2 hidden sm:block">{a.excerpt}</p>}
      </div>
    </Link>
  );
}

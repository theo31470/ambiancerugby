import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ChoixProduit from "@/components/shop/ChoixProduit";
import { getProduit } from "@/lib/shop/catalogue";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/boutique/[slug]">): Promise<Metadata> {
  const p = await getProduit((await params).slug);
  return p ? { title: `${p.name} : boutique`, description: p.description ?? undefined, openGraph: { images: p.images.slice(0, 1) } } : {};
}

export default async function ProduitPage({ params }: PageProps<"/boutique/[slug]">) {
  const p = await getProduit((await params).slug);
  if (!p) notFound();
  return (
    <div>
      <Link href="/boutique" className="text-sm text-sourdine underline underline-offset-4">La boutique</Link>
      <div className="mt-4"><ChoixProduit p={p} /></div>
    </div>
  );
}

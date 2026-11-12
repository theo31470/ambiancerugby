import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMatch } from "@/lib/queries";
import { urlMatch } from "@/lib/seo";
import PageHeader from "@/components/admin/PageHeader";
import EditeurPost from "@/components/admin/EditeurPost";
import FormTerrain from "@/components/admin/FormTerrain";
import { SLIDES_APRES_MATCH } from "@/lib/contenu/visuel";

export const metadata = { title: "Post d'après-match" };

export default async function PostApresMatch({ params }: PageProps<"/studio/contenu/apres-match/[id]">) {
  const { id } = await params;
  const m = await getMatch(id);
  if (!m) notFound();
  const db = await createClient();
  const { data: terrain } = await db.from("match_terrain").select("source_id,evenements").eq("match_id", m.id).maybeSingle();
  const places = terrain ? (terrain.evenements as { x: number | null }[]).filter((a) => a.x != null).length : null;
  const { data: existant } = await db.from("contenus").select("titre,legende,reseaux,statut,prevu_le").eq("match_id", m.id).eq("modele", "apres-match").maybeSingle();
  const nom = (t: { short_name: string | null; name: string }) => t.short_name ?? t.name;
  const titre = `${nom(m.home)} ${m.home_score ?? ""}-${m.away_score ?? ""} ${nom(m.away)}`.replace(/\s+-\s+/, " – ");
  const fini = m.status === "finished" && m.home_score != null;

  return (
    <div>
      <Link href="/studio/contenu" className="text-sm text-sourdine hover:text-vin">← Contenu</Link>
      <PageHeader titre={`Après-match : ${nom(m.home)} – ${nom(m.away)}`}
        description={<>{m.competition.name}, {new Date(m.kickoff_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" })}. Carrousel prêt à poster, généré avec les données du site.</>}
        actions={<a href={urlMatch(m)} target="_blank" rel="noopener" className="bouton-discret text-sm">Page du match ↗</a>} />
      {fini
        ? <EditeurPost matchId={m.id} titre={titre} slides={SLIDES_APRES_MATCH} existant={existant ?? null} />
        : <p className="rounded-2xl bg-teinte p-5">Le carrousel sera disponible dès la fin du match (score final et notes des joueurs).</p>}
      {fini && <FormTerrain matchId={m.id} dejaLa={places} srId={terrain?.source_id ?? null} />}
    </div>
  );
}

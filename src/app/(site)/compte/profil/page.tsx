import Link from "next/link";
import type { Metadata } from "next";
import { getViewer, publicClient } from "@/lib/supabase/server";
import { MesDonnees, Preferences, ProfilPublic, Securite } from "@/components/compte/Parametres";
import { deconnecterPartout } from "../actions";
import type { Prefs } from "@/lib/membres";

export const metadata: Metadata = { title: "Paramètres du compte", robots: { index: false } };

const ANCRES = [["profil", "Profil public"], ["preferences", "Préférences"], ["securite", "Sécurité"], ["donnees", "Mes données"]] as const;

export default async function ParametresPage() {
  const viewer = (await getViewer())!;
  const { data: teams } = await publicClient().from("teams").select("id,name").order("name");
  const m = {
    display_name: viewer.display_name, username: viewer.username, avatar_url: viewer.avatar_url, bio: viewer.bio ?? null, ville: viewer.ville ?? null,
    je_suis: viewer.je_suis ?? null, favorite_team_id: viewer.favorite_team_id, profil_public: viewer.profil_public ?? true,
    prefs: (viewer.prefs ?? {}) as Prefs, email: viewer.email ?? null,
  };
  return (
    <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] items-start">
      <nav aria-label="Sections des paramètres" className="lg:sticky lg:top-24 flex lg:flex-col gap-1 overflow-x-auto defile-scroll">
        {ANCRES.map(([id, l]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-xl px-3 py-2 font-semibold hover:bg-teinte">{l}</a>)}
        {viewer.username && m.profil_public && <Link href={`/membres/${viewer.username}`} className="shrink-0 rounded-xl px-3 py-2 text-sm text-vin underline underline-offset-4">Voir ma page publique</Link>}
      </nav>
      <div className="grid gap-6 min-w-0">
        <ProfilPublic m={m} teams={(teams ?? []) as { id: string; name: string }[]} />
        <Preferences m={m} />
        <Securite m={m} deconnecter={deconnecterPartout} />
        <MesDonnees />
      </div>
    </div>
  );
}

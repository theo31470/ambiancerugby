/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { createClient, getViewer, hasBadge, publicClient } from "@/lib/supabase/server";
import { TEAM_LITE } from "@/lib/queries";
import type { TeamLite } from "@/lib/types";
import { gradeDe } from "@/lib/membres";
import { signOut } from "@/app/actions";
import TeamBadge from "@/components/TeamBadge";
import SonStade from "@/components/deco/SonStade";
import BoutonInstaller from "@/components/app/BoutonInstaller";
import { CompteurPanier } from "@/components/nav/MoiClient";
import { Ballon, Coupe, Echarpe, Journal, Maillot, Podium, Sifflet } from "@/components/deco/Icones";

export const metadata: Metadata = { title: "Moi", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Espace « Moi » de l'app : compte, mon club, alertes, Supporter, boutique, rubriques et réglages, au même endroit. */
export default async function MoiPage() {
  const viewer = await getViewer();
  const badge = hasBadge(viewer);
  let club: TeamLite | null = null;
  let nonLues = 0;
  if (viewer) {
    const supabase = await createClient();
    const [c, n] = await Promise.all([
      viewer.favorite_team_id ? publicClient().from("teams").select(TEAM_LITE).eq("id", viewer.favorite_team_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null),
    ]);
    club = (c.data as TeamLite | null) ?? null;
    nonLues = n.count ?? 0;
  }
  const nom = viewer?.display_name ?? viewer?.email?.split("@")[0] ?? null;

  return (
    <div className="lg:max-w-2xl lg:mx-auto">
      {/* carte d'identité */}
      <section className="pleine-largeur lg:w-auto lg:ml-0 lg:rounded-3xl -mt-6 sm:-mt-10 lg:mt-0 bg-bordeaux text-white relative overflow-hidden">
        <img src="/logo-blanc.png" alt="" aria-hidden className="absolute -right-8 -bottom-10 w-48 opacity-10 -rotate-12" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-7">
          {viewer ? (
            <Link href="/compte" className="flex items-center gap-4 group">
              <span className={`w-16 h-16 shrink-0 rounded-full grid place-items-center groovy text-3xl ${badge ? "bg-moutarde text-bordeaux ring-4 ring-white/20" : "bg-white/15"}`}>
                {(nom ?? "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="groovy text-3xl block truncate">Salut {nom} !</span>
                <span className="text-sm text-white/70 flex items-center gap-2 mt-0.5">
                  {badge && <span className="text-[11px] font-bold rounded-full bg-moutarde text-bordeaux px-2 py-0.5">{gradeDe((viewer as { supporter_grade?: number }).supporter_grade)}</span>}
                  Voir mon espace
                </span>
              </span>
              <Chevron className="text-white/50 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <div>
              <p className="groovy text-3xl leading-tight">Rejoins la tribune</p>
              <p className="text-white/75 mt-1.5 text-sm">Suis ton club, fais tes pronos entre potes et reçois les alertes de tes matchs.</p>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <Link href="/inscription" className="bouton-or">Créer un compte</Link>
                <Link href="/connexion" className="inline-flex items-center justify-center rounded-full border border-white/30 font-semibold py-2.5 hover:bg-white/10">Connexion</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 mt-6">
        {/* mon club */}
        {viewer && (
          club ? (
            <Link href={`/clubs/${club.slug}`} className="flex items-center gap-4 rounded-3xl p-4 text-white relative overflow-hidden"
              style={{ background: `linear-gradient(120deg, color-mix(in oklab, ${club.color ?? "var(--vin)"} 72%, #12060a) 0%, color-mix(in oklab, ${club.color ?? "var(--vin)"} 42%, #12060a) 100%)` }}>
              <span className="w-14 h-14 rounded-2xl bg-white grid place-items-center shrink-0"><TeamBadge team={club} size="md" /></span>
              <span className="min-w-0 flex-1">
                <span className="text-xs uppercase tracking-wider font-bold text-white/70">Mon club</span>
                <span className="titre text-xl font-bold block truncate">{club.name}</span>
                <span className="text-sm text-white/80">Prochain match, forme, effectif</span>
              </span>
              <Chevron className="text-white/70" />
            </Link>
          ) : (
            <Link href="/compte/profil" className="flex items-center gap-4 rounded-3xl p-4 border-2 border-dashed border-trait hover:border-vin">
              <span className="w-14 h-14 rounded-2xl bg-teinte grid place-items-center shrink-0"><Echarpe className="h-8 w-auto text-vin" /></span>
              <span className="flex-1">
                <span className="font-semibold block">Choisis ton club de cœur</span>
                <span className="text-sm text-sourdine">Ses matchs et ses actus en premier, partout.</span>
              </span>
              <Chevron className="text-sourdine" />
            </Link>
          )
        )}

        {viewer && (
          <Groupe titre="Mon espace">
            <Ligne href="/compte/alertes" label="Alertes" icone={<IconeCloche />} droite={nonLues > 0 ? <Pastille n={nonLues} /> : null} />
            <Ligne href="/compte/carnet" label="Mon carnet" detail="Les matchs que tu as vus" icone={<Journal className="h-6 w-auto" />} />
            <Ligne href="/compte" label="Mon tableau" detail="Pronos, ligues, grade" icone={<Podium className="h-6 w-auto" />} />
            <Ligne href="/compte/profil" label="Profil et paramètres" detail="Club, thème, notifications" icone={<IconeReglages />} />
          </Groupe>
        )}

        {!badge && (
          <Link href="/abonnement" className="flex items-center gap-4 rounded-3xl bg-moutarde text-bordeaux p-4 shadow-[0_4px_0_0_var(--or)] active:translate-y-0.5 active:shadow-none transition-all">
            <Ballon className="w-12 shrink-0 text-bordeaux [--deco-trait:var(--moutarde)]" />
            <span className="flex-1">
              <span className="groovy text-xl block leading-tight">Deviens Supporter</span>
              <span className="text-sm font-medium">Stats complètes, alertes, exclusivités · 5,99 €/mois</span>
            </span>
            <Chevron />
          </Link>
        )}

        <Groupe titre="Explorer">
          <Ligne href="/actus" label="Actus" detail="Analyses, transferts, avant-matchs" icone={<Journal className="h-6 w-auto" />} />
          <Ligne href="/competitions" label="Compétitions" detail="Classements et résultats" icone={<Coupe className="h-6 w-auto" />} />
          <Ligne href="/joueurs" label="Joueurs" detail="Stats et notes sur 10" icone={<Maillot className="h-6 w-auto" />} />
          <Ligne href="/indice" label="Indice Ambiance" detail="Notre classement de puissance" icone={<Podium className="h-6 w-auto" />} />
          <Ligne href="/matchs" label="Calendrier" detail="Tous les matchs" icone={<Sifflet className="h-6 w-auto" />} />
        </Groupe>

        <Groupe titre="Boutique">
          <Ligne href="/boutique" label="La boutique" detail="Maillots, sweats et goodies" icone={<Maillot className="h-6 w-auto" />} />
          <Ligne href="/boutique/panier" label="Mon panier" icone={<IconeSac />} droite={<CompteurPanier />} />
          {viewer && <Ligne href="/compte/commandes" label="Mes commandes" detail="Suivi et factures" icone={<IconeColis />} />}
          {viewer && badge && <Ligne href="/compte/abonnement" label="Mon abonnement" icone={<Ballon className="h-5 w-auto" />} />}
        </Groupe>

        <Groupe titre="Réglages">
          <div className="px-4 py-3.5 bg-bordeaux rounded-t-[inherit]"><SonStade variante="menu" /></div>
          <div className="px-4 py-3 empty:hidden"><BoutonInstaller className="w-full text-left font-semibold text-vin py-1" /></div>
        </Groupe>

        {viewer && (
          <form action={signOut} className="text-center">
            <button className="text-sm font-semibold text-sourdine hover:text-alerte px-4 py-2">Se déconnecter</button>
          </form>
        )}

        <p className="text-center text-xs text-sourdine pb-2">Ambiance Rugby · le rugby côté tribune</p>
      </div>
    </div>
  );
}

function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider font-bold text-sourdine px-2 mb-2">{titre}</h2>
      <div className="rounded-3xl bg-surface border border-trait divide-y divide-trait overflow-hidden">{children}</div>
    </section>
  );
}

function Ligne({ href, label, detail, icone, droite }: { href: string; label: string; detail?: string; icone: ReactNode; droite?: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3.5 px-4 py-3 hover:bg-teinte active:bg-teinte transition-colors">
      <span className="w-10 h-10 rounded-xl bg-teinte text-vin grid place-items-center shrink-0 [--deco-trait:var(--surface)]">{icone}</span>
      <span className="flex-1 min-w-0">
        <span className="font-semibold block">{label}</span>
        {detail && <span className="text-sm text-sourdine block truncate">{detail}</span>}
      </span>
      {droite}
      <Chevron className="text-sourdine/60" />
    </Link>
  );
}

const Pastille = ({ n }: { n: number }) => (
  <span className="min-w-6 h-6 px-1.5 rounded-full bg-moutarde text-bordeaux text-xs font-bold grid place-items-center tnum">{n > 99 ? "99+" : n}</span>
);

const Chevron = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 20 20" className={`w-4 h-4 shrink-0 ${className}`} aria-hidden><path d="m7.5 4.5 5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconeCloche = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
const IconeReglages = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2.2" /><circle cx="8" cy="17" r="2.2" /></svg>
);
const IconeSac = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></svg>
);
const IconeColis = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></svg>
);

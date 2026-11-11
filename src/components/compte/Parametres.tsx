"use client";
/* eslint-disable @next/next/no-img-element */
import { useActionState, useState } from "react";
import { changerEmail, changerMotDePasse, enregistrerPreferences, enregistrerProfil, supprimerCompte } from "@/app/(site)/compte/actions";
import { JE_SUIS, PREFS_DEFAUT, type Prefs } from "@/lib/membres";
import type { FormState } from "@/app/actions";

type Membre = { display_name: string | null; username: string | null; avatar_url: string | null; bio: string | null; ville: string | null; je_suis: string | null; favorite_team_id: string | null; profil_public: boolean; prefs: Prefs; email: string | null };

function Retour({ s }: { s: FormState }) {
  if (s?.error) return <p role="alert" className="text-sm text-alerte">{s.error}</p>;
  if (s?.ok) return <p role="status" className="text-sm font-semibold text-ok">{s.ok}</p>;
  return null;
}

function Section({ id, titre, intro, children }: { id: string; titre: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`h-${id}`} className="bg-surface border border-trait rounded-2xl p-5 sm:p-7 scroll-mt-28">
      <h2 id={`h-${id}`} className="titre text-2xl font-extrabold">{titre}</h2>
      {intro && <p className="text-sm text-sourdine mt-1 max-w-prose">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ProfilPublic({ m, teams }: { m: Membre; teams: { id: string; name: string }[] }) {
  const [s, action, envoi] = useActionState(enregistrerProfil, undefined);
  const [apercu, setApercu] = useState<string | null>(m.avatar_url);
  const [bio, setBio] = useState(m.bio ?? "");
  return (
    <Section id="profil" titre="Profil public" intro="Ce que les autres membres voient à côté de vos commentaires et sur votre page de supporter.">
      <form action={action} className="grid gap-5">
        <div className="flex flex-wrap items-center gap-4">
          {apercu ? <img src={apercu} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-trait" />
            : <span className="w-20 h-20 rounded-full bg-teinte grid place-items-center groovy text-3xl text-vin">{(m.display_name ?? "?").slice(0, 1).toUpperCase()}</span>}
          <div className="grid gap-1.5">
            <label className="bouton-discret cursor-pointer">
              Choisir une photo
              <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setApercu(URL.createObjectURL(f)); }} />
            </label>
            {m.avatar_url && <label className="text-sm text-sourdine flex items-center gap-2"><input type="checkbox" name="retirer_avatar" value="1" /> Retirer ma photo</label>}
            <p className="text-xs text-sourdine">JPEG, PNG ou WebP, 3 Mo au plus.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">Nom affiché<input name="display_name" defaultValue={m.display_name ?? ""} maxLength={40} className="champ" /></label>
          <label className="grid gap-1 text-sm font-semibold">Pseudo<input name="username" defaultValue={m.username ?? ""} maxLength={30} placeholder="ex. pilier31" className="champ" /></label>
          <label className="grid gap-1 text-sm font-semibold">Ville<input name="ville" defaultValue={m.ville ?? ""} maxLength={60} placeholder="Toulouse" className="champ" /></label>
          <label className="grid gap-1 text-sm font-semibold">Dans le rugby, je suis
            <select name="je_suis" defaultValue={m.je_suis ?? ""} className="champ">
              <option value="">Je préfère ne pas dire</option>
              {Object.entries(JE_SUIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Mon club de cœur
            <select name="favorite_team_id" defaultValue={m.favorite_team_id ?? ""} className="champ">
              <option value="">Aucun</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
            <span className="flex justify-between">Quelques mots sur vous <span className="font-normal text-sourdine tnum">{bio.length}/280</span></span>
            <textarea name="bio" value={bio} onChange={(e) => setBio(e.target.value.slice(0, 280))} rows={3} placeholder="Abonné à Ernest-Wallon depuis 1998, fan de mêlées fermées." className="champ" />
          </label>
        </div>
        <Retour s={s} />
        <button className="bouton justify-self-start" disabled={envoi}>{envoi ? "Enregistrement…" : "Enregistrer mon profil"}</button>
      </form>
    </Section>
  );
}

function Interrupteur({ name, label, aide, defaut }: { name: string; label: string; aide?: string; defaut: boolean }) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 border-b border-trait last:border-0 cursor-pointer">
      <span><span className="font-semibold">{label}</span>{aide && <span className="block text-sm text-sourdine">{aide}</span>}</span>
      <input type="checkbox" name={name} defaultChecked={defaut} className="peer sr-only" />
      <span aria-hidden className="relative shrink-0 mt-1 w-11 h-6 rounded-full bg-trait transition-colors peer-checked:bg-vin peer-focus-visible:ring-2 peer-focus-visible:ring-vin peer-focus-visible:ring-offset-2 after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}

export function Preferences({ m }: { m: Membre }) {
  const [s, action, envoi] = useActionState(enregistrerPreferences, undefined);
  const p = { ...PREFS_DEFAUT, ...m.prefs };
  return (
    <Section id="preferences" titre="Préférences" intro="Affichage, alertes et e-mails. Modifiables à tout moment.">
      <form action={action} className="grid gap-6">
        <fieldset>
          <legend className="font-bold mb-2">Thème</legend>
          <div className="flex flex-wrap gap-2">
            {([["auto", "Comme mon appareil"], ["clair", "Clair"], ["sombre", "Sombre"]] as const).map(([v, l]) => (
              <label key={v} className="cursor-pointer">
                <input type="radio" name="theme" value={v} defaultChecked={p.theme === v} className="peer sr-only" />
                <span className="inline-block rounded-full border-2 border-trait px-4 py-1.5 font-semibold peer-checked:border-vin peer-checked:bg-teinte peer-focus-visible:ring-2 peer-focus-visible:ring-vin">{l}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-bold">Alertes sur le site</legend>
          <Interrupteur name="alertes_debut" label="Coup d'envoi" aide="Quand un match de mes clubs commence." defaut={p.alertes_debut} />
          <Interrupteur name="alertes_essais" label="Essais" aide="Chaque essai de mes clubs, en direct." defaut={p.alertes_essais} />
          <Interrupteur name="alertes_resultat" label="Résultat final" defaut={p.alertes_resultat} />
          <Interrupteur name="celebrations" label="Célébrations à l'écran" aide="Ballon, confettis et « ESSAI ! » en direct." defaut={p.celebrations} />
        </fieldset>
        <fieldset>
          <legend className="font-bold">Alertes sur mesure <span className="ml-1 text-[10px] font-bold rounded-full bg-moutarde text-bordeaux px-1.5 py-0.5 align-middle">Supporter</span></legend>
          <Interrupteur name="alertes_joueurs" label="Essais de mes joueurs favoris" aide="Dès qu'un joueur que vous suivez marque." defaut={p.alertes_joueurs} />
          <Interrupteur name="alertes_serre" label="Fin de match serrée" aide="À partir de la 70e, quand l'écart est de 7 points ou moins." defaut={p.alertes_serre} />
          <Interrupteur name="alertes_cartons" label="Cartons" aide="Chaque carton jaune ou rouge dans les matchs de mes clubs." defaut={p.alertes_cartons} />
          <Interrupteur name="alertes_simulateur" label="Top 6 du simulateur" aide="Quand mon club entre dans le top 6 projeté ou en sort." defaut={p.alertes_simulateur} />
          <Interrupteur name="couleurs_club" label="Le site aux couleurs de mon club" aide="Les accents du site prennent la couleur de votre club favori." defaut={p.couleurs_club} />
        </fieldset>
        <fieldset>
          <legend className="font-bold">E-mails</legend>
          <Interrupteur name="email_alertes" label="Résumé de mes clubs" aide="Après chaque journée : résultats, notes, prochains matchs." defaut={p.email_alertes} />
          <Interrupteur name="email_actus" label="La lettre d'Ambiance Rugby" aide="Le meilleur de la semaine, une fois par semaine." defaut={p.email_actus} />
          <Interrupteur name="email_boutique" label="Boutique" aide="Nouveautés et offres de la boutique." defaut={p.email_boutique} />
        </fieldset>
        <fieldset>
          <legend className="font-bold">Confidentialité</legend>
          <Interrupteur name="profil_public" label="Page de supporter visible" aide="Si désactivé, seuls votre nom et votre photo apparaissent à côté de vos commentaires." defaut={m.profil_public} />
        </fieldset>
        <Retour s={s} />
        <button className="bouton justify-self-start" disabled={envoi}>{envoi ? "Enregistrement…" : "Enregistrer mes préférences"}</button>
      </form>
    </Section>
  );
}

export function Securite({ m, deconnecter }: { m: Membre; deconnecter: () => Promise<void> }) {
  const [se, actionEmail, envoiE] = useActionState(changerEmail, undefined);
  const [sm, actionMdp, envoiM] = useActionState(changerMotDePasse, undefined);
  return (
    <Section id="securite" titre="Connexion et sécurité">
      <div className="grid gap-8 lg:grid-cols-2">
        <form action={actionEmail} className="grid gap-3 content-start">
          <h3 className="font-bold">Adresse e-mail</h3>
          <p className="text-sm text-sourdine">Actuelle : <strong className="text-encre">{m.email}</strong></p>
          <label className="grid gap-1 text-sm font-semibold">Nouvelle adresse<input type="email" name="email" required autoComplete="email" className="champ" /></label>
          <Retour s={se} />
          <button className="bouton-discret justify-self-start" disabled={envoiE}>{envoiE ? "Envoi…" : "Changer d'adresse"}</button>
        </form>
        <form action={actionMdp} className="grid gap-3 content-start">
          <h3 className="font-bold">Mot de passe</h3>
          <label className="grid gap-1 text-sm font-semibold">Mot de passe actuel<input type="password" name="actuel" required autoComplete="current-password" className="champ" /></label>
          <label className="grid gap-1 text-sm font-semibold">Nouveau mot de passe<input type="password" name="nouveau" required minLength={8} autoComplete="new-password" className="champ" /></label>
          <label className="grid gap-1 text-sm font-semibold">Confirmer<input type="password" name="confirmation" required minLength={8} autoComplete="new-password" className="champ" /></label>
          <Retour s={sm} />
          <button className="bouton-discret justify-self-start" disabled={envoiM}>{envoiM ? "Modification…" : "Changer de mot de passe"}</button>
        </form>
      </div>
      <form action={deconnecter} className="mt-8 pt-6 border-t border-trait flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sourdine max-w-prose">Un appareil perdu ou un ordinateur partagé ? Déconnectez toutes les sessions ouvertes, y compris celle-ci.</p>
        <button className="bouton-discret">Me déconnecter partout</button>
      </form>
    </Section>
  );
}

export function MesDonnees() {
  const [s, action, envoi] = useActionState(supprimerCompte, undefined);
  const [ouvert, setOuvert] = useState(false);
  return (
    <Section id="donnees" titre="Mes données">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sourdine max-w-prose">Téléchargez tout ce qu&apos;Ambiance Rugby garde sur vous : profil, commentaires, clubs et joueurs suivis, alertes, commandes, factures.</p>
        <a href="/compte/export" className="bouton-discret" download>Télécharger mes données</a>
      </div>
      <div className="mt-8 pt-6 border-t border-trait">
        <h3 className="font-bold text-alerte">Supprimer mon compte</h3>
        <p className="text-sm text-sourdine mt-1 max-w-prose">Définitif : profil, commentaires, suivis et alertes sont effacés. Les factures restent conservées, comme la loi l&apos;impose. Pensez à résilier votre abonnement Supporter avant.</p>
        {!ouvert ? <button type="button" onClick={() => setOuvert(true)} className="mt-3 text-sm font-semibold text-alerte underline underline-offset-4">Je veux supprimer mon compte</button> : (
          <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm font-semibold">Tapez SUPPRIMER pour confirmer<input name="confirmation" autoComplete="off" className="champ" /></label>
            <button className="rounded-full bg-alerte text-white font-semibold px-4 py-2.5 disabled:opacity-60" disabled={envoi}>{envoi ? "Suppression…" : "Supprimer définitivement"}</button>
            <div className="w-full"><Retour s={s} /></div>
          </form>
        )}
      </div>
    </Section>
  );
}

import { renderEmail, type EmailContent, type Ligne } from "./layout";

/**
 * Tous les modèles d'e-mails d'Ambiance Rugby. Fonctions pures :
 * elles servent à l'envoi comme à l'aperçu.
 */

export type BuiltEmail = { subject: string; html: string; text: string };

const build = (subject: string, content: EmailContent, siteUrl: string): BuiltEmail => ({ subject, ...renderEmail(content, { siteUrl }) });
const bonjour = (nom?: string | null) => (nom?.trim() ? `Bonjour ${nom.trim().split(/\s+/)[0]},` : "Bonjour,");
export const euros = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} €`;
export const dateFr = (iso: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", ...opts }).format(new Date(iso)) : "";

// ---------------------------------------------------------------------
// Compte (envoyés à la demande de Supabase Auth)
// ---------------------------------------------------------------------

export const AUTH_TEMPLATES = [
  "signup", "recovery", "magiclink", "invite", "email_change_current", "email_change_new", "reauthentication",
  "password_changed_notification", "email_changed_notification", "mfa_factor_enrolled_notification", "mfa_factor_unenrolled_notification",
  "identity_linked_notification", "identity_unlinked_notification", "phone_changed_notification",
] as const;
export type AuthTemplate = (typeof AUTH_TEMPLATES)[number];
export type AuthEmailInput = { name?: string | null; url?: string; code?: string; newEmail?: string };

const PAS_VOUS = "Vous n'êtes pas à l'origine de cette demande ? Ignorez simplement cet e-mail : rien ne changera sur votre compte.";
const RAISON_SECU = "Vous recevez cet e-mail de sécurité parce qu'il concerne votre compte Ambiance Rugby.";

export function authEmail(template: AuthTemplate, input: AuthEmailInput, siteUrl: string): BuiltEmail {
  const site = siteUrl.replace(/\/$/, "");
  const url = input.url ?? site;
  const alerte = (subject: string, heading: string, quoi: string): BuiltEmail => build(subject, {
    preheader: quoi, heading,
    blocks: [
      { type: "p", text: bonjour(input.name) }, { type: "p", text: quoi },
      { type: "note", tone: "danger", text: "**Ce n'est pas vous ?** Changez tout de suite votre mot de passe et vérifiez les réglages de votre compte." },
      { type: "button", label: "Sécuriser mon compte", url: `${site}/mot-de-passe-oublie` },
    ],
    reason: RAISON_SECU,
  }, site);

  switch (template) {
    case "signup":
      return build("Confirmez votre adresse e-mail", {
        preheader: "Une dernière étape pour activer votre compte.",
        heading: "Confirmez votre adresse e-mail",
        blocks: [
          { type: "p", text: bonjour(input.name) },
          { type: "p", text: "Merci de votre inscription sur **Ambiance Rugby**. Cliquez sur le bouton ci-dessous pour confirmer votre adresse et activer votre compte." },
          { type: "button", label: "Confirmer mon adresse", url },
          { type: "p", text: "Vous pourrez ensuite suivre vos équipes, recevoir les alertes de match et commenter les rencontres." },
          { type: "note", text: "Ce lien ne sert qu'une fois et expire au bout de 24 heures. " + PAS_VOUS },
          { type: "fallback", url },
        ],
        reason: "Vous recevez cet e-mail parce que cette adresse vient d'être utilisée pour créer un compte Ambiance Rugby.",
      }, site);
    case "recovery":
      return build("Réinitialisez votre mot de passe", {
        preheader: "Choisissez un nouveau mot de passe en un clic.",
        heading: "Réinitialiser votre mot de passe",
        blocks: [
          { type: "p", text: bonjour(input.name) },
          { type: "p", text: "Vous avez demandé à changer le mot de passe de votre compte. Ce bouton vous connecte et vous amène au choix du nouveau mot de passe. Il est valable **1 heure**." },
          { type: "button", label: "Choisir un nouveau mot de passe", url },
          { type: "note", text: PAS_VOUS },
          { type: "fallback", url },
        ],
        reason: RAISON_SECU,
      }, site);
    case "magiclink":
      return build("Votre lien de connexion", {
        preheader: "Connectez-vous à Ambiance Rugby en un clic.",
        heading: "Votre lien de connexion",
        blocks: [
          { type: "p", text: bonjour(input.name) },
          { type: "p", text: "Voici le lien pour vous connecter à votre compte, sans mot de passe." },
          { type: "button", label: "Me connecter", url },
          { type: "note", text: "Ce lien ne sert qu'une fois et expire au bout d'une heure. " + PAS_VOUS },
          { type: "fallback", url },
        ],
        reason: RAISON_SECU,
      }, site);
    case "invite":
      return build("Vous êtes invité sur Ambiance Rugby", {
        preheader: "Un compte vous attend.",
        heading: "Vous êtes invité",
        blocks: [
          { type: "p", text: bonjour(input.name) },
          { type: "p", text: "Un compte Ambiance Rugby a été créé pour vous. Acceptez l'invitation, puis choisissez votre mot de passe." },
          { type: "button", label: "Accepter l'invitation", url },
          { type: "fallback", url },
        ],
        reason: "Vous recevez cet e-mail parce que l'équipe d'Ambiance Rugby vous a invité.",
      }, site);
    case "email_change_current":
      return build("Confirmez le changement d'adresse e-mail", {
        preheader: "Une demande de changement d'adresse a été faite sur votre compte.",
        heading: "Changement d'adresse e-mail",
        blocks: [
          { type: "p", text: bonjour(input.name) },
          { type: "p", text: `Vous avez demandé à remplacer cette adresse par **${input.newEmail ?? "une nouvelle adresse"}**. Confirmez depuis cette adresse-ci pour valider le changement.` },
          { type: "button", label: "Confirmer le changement", url },
          { type: "note", tone: "danger", text: "**Ce n'est pas vous ?** Ne cliquez pas, et changez votre mot de passe : quelqu'un a peut-être accès à votre compte." },
          { type: "fallback", url },
        ],
        reason: RAISON_SECU,
      }, site);
    case "email_change_new":
      return build("Confirmez votre nouvelle adresse e-mail", {
        preheader: "Validez cette adresse pour votre compte Ambiance Rugby.",
        heading: "Confirmez votre nouvelle adresse",
        blocks: [
          { type: "p", text: bonjour(input.name) },
          { type: "p", text: "Cette adresse va devenir celle de votre compte Ambiance Rugby. Confirmez-la pour terminer le changement." },
          { type: "button", label: "Confirmer cette adresse", url },
          { type: "note", text: PAS_VOUS },
          { type: "fallback", url },
        ],
        reason: "Vous recevez cet e-mail parce que cette adresse a été indiquée comme nouvelle adresse d'un compte Ambiance Rugby.",
      }, site);
    case "reauthentication":
      return build(`${input.code ?? "000000"} : votre code de vérification`, {
        preheader: "Votre code de vérification Ambiance Rugby.",
        heading: "Votre code de vérification",
        blocks: [
          { type: "p", text: bonjour(input.name) },
          { type: "p", text: "Pour confirmer cette action, saisissez ce code :" },
          { type: "code", value: input.code ?? "000000" },
          { type: "note", text: "Ce code expire rapidement. Ne le communiquez à personne : Ambiance Rugby ne vous le demandera jamais." },
        ],
        reason: RAISON_SECU,
      }, site);
    case "password_changed_notification":
      return alerte("Votre mot de passe a été modifié", "Mot de passe modifié", "Le mot de passe de votre compte Ambiance Rugby vient d'être modifié.");
    case "email_changed_notification":
      return alerte("Votre adresse e-mail a été modifiée", "Adresse e-mail modifiée", `L'adresse de votre compte Ambiance Rugby a été remplacée${input.newEmail ? ` par ${input.newEmail}` : ""}.`);
    case "mfa_factor_enrolled_notification":
      return alerte("Double authentification activée", "Double authentification activée", "Un code de vérification est désormais demandé à la connexion sur votre compte.");
    case "mfa_factor_unenrolled_notification":
      return alerte("Double authentification retirée", "Double authentification retirée", "La double authentification vient d'être retirée de votre compte Ambiance Rugby.");
    case "identity_linked_notification":
      return alerte("Nouveau mode de connexion", "Nouveau mode de connexion", "Un nouveau mode de connexion vient d'être ajouté à votre compte Ambiance Rugby.");
    case "identity_unlinked_notification":
      return alerte("Mode de connexion retiré", "Mode de connexion retiré", "Un mode de connexion vient d'être retiré de votre compte Ambiance Rugby.");
    case "phone_changed_notification":
      return alerte("Numéro de téléphone modifié", "Téléphone modifié", "Le numéro de téléphone de votre compte Ambiance Rugby vient d'être modifié.");
  }
}

// ---------------------------------------------------------------------
// Abonnement Supporter
// ---------------------------------------------------------------------

export type SupporterTemplate = "bienvenue" | "facture" | "paiement_refuse" | "resiliation" | "termine" | "remboursement";
export type SupporterInput = {
  name?: string | null;
  formule: "mensuel" | "annuel";
  montantCents?: number;
  numero?: string | null;
  date?: string | null;
  periodeDebut?: string | null;
  periodeFin?: string | null;
  carte?: string | null;
  finAcces?: string | null;
  /** Numéro de l'avoir émis pour un remboursement. */
  avoir?: string | null;
};

const LIBELLE = { mensuel: "Supporter mensuel", annuel: "Supporter annuel" } as const;
const PRIX = { mensuel: "2,99 €/mois", annuel: "29 €/an" } as const;
const RAISON_ABO = "Vous recevez cet e-mail car il concerne votre abonnement Supporter Ambiance Rugby.";

export function supporterEmail(template: SupporterTemplate, i: SupporterInput, siteUrl: string): BuiltEmail {
  const site = siteUrl.replace(/\/$/, "");
  const compte = `${site}/compte/abonnement`;
  switch (template) {
    case "bienvenue":
      return build("Bienvenue parmi les Supporters", {
        preheader: "Votre abonnement Supporter est actif.",
        heading: "Bienvenue parmi les Supporters",
        blocks: [
          { type: "p", text: bonjour(i.name) },
          { type: "p", text: `Votre abonnement **${LIBELLE[i.formule]}** est actif. Merci, c'est grâce à vous qu'Ambiance Rugby reste indépendant.` },
          { type: "lignes", rows: [
            { label: "Stats complètes", detail: "Notes des joueurs, Indice de toutes les équipes, pronostics", valeur: "Inclus" },
            { label: "Alertes de match", detail: "Coup d'envoi, essais et score final de vos clubs", valeur: "Inclus" },
            { label: "Contenus réservés", detail: "Analyses et avant-matchs", valeur: "Inclus" },
            { label: "Badge Supporter", detail: "Sur votre profil et vos commentaires", valeur: "Inclus" },
          ] },
          { type: "button", label: "Accéder à mon compte", url: compte },
          { type: "note", text: `**${PRIX[i.formule]}**${i.periodeFin ? `, prochain renouvellement le ${dateFr(i.periodeFin)}` : ""}. Résiliable à tout moment depuis Mon compte › Abonnement.` },
        ],
        reason: "Vous recevez cet e-mail car vous venez de souscrire l'abonnement Supporter.",
      }, site);
    case "facture": {
      const url = i.numero ? `${site}/factures/${encodeURIComponent(i.numero)}` : compte;
      const rows: Ligne[] = [{ label: LIBELLE[i.formule], detail: i.periodeDebut && i.periodeFin ? `Du ${dateFr(i.periodeDebut, { dateStyle: "short" })} au ${dateFr(i.periodeFin, { dateStyle: "short" })}` : undefined, valeur: euros(i.montantCents ?? 0) }];
      if (i.carte) rows.push({ label: "Moyen de paiement", detail: i.carte });
      return build(`Votre facture ${i.numero ?? ""}`.trim(), {
        preheader: `Facture ${i.numero ?? ""} : ${euros(i.montantCents ?? 0)}.`,
        heading: `Votre facture ${i.numero ?? ""}`.trim(),
        blocks: [
          { type: "p", text: bonjour(i.name) },
          { type: "p", text: `Votre paiement du ${dateFr(i.date ?? new Date().toISOString())} a bien été reçu. Voici le récapitulatif :` },
          { type: "lignes", rows, total: { label: "Total payé", valeur: euros(i.montantCents ?? 0) } },
          { type: "button", label: "Télécharger la facture (PDF)", url },
          { type: "p", text: "La facture est aussi **jointe à cet e-mail**, et toutes vos factures restent disponibles dans **Mon compte › Abonnement**." },
        ],
        reason: "Vous recevez cet e-mail car un paiement a été effectué sur votre compte. TVA non applicable, art. 293 B du CGI.",
      }, site);
    }
    case "paiement_refuse":
      return build("Votre paiement n'est pas passé", {
        preheader: "Mettez à jour votre carte pour garder votre accès Supporter.",
        heading: "Votre paiement n'est pas passé",
        blocks: [
          { type: "p", text: bonjour(i.name) },
          { type: "p", text: `Le renouvellement de votre abonnement **${LIBELLE[i.formule]}**${i.montantCents ? ` (${euros(i.montantCents)})` : ""} a été refusé par votre banque${i.carte ? ` (${i.carte})` : ""}.` },
          { type: "note", text: "Pas d'inquiétude : nous réessayons automatiquement dans les prochains jours, et votre accès reste ouvert en attendant. Pour régler la situation tout de suite, changez de carte." },
          { type: "button", label: "Mettre à jour ma carte", url: compte },
        ],
        reason: RAISON_ABO,
      }, site);
    case "resiliation":
      return build("Votre résiliation est prise en compte", {
        preheader: i.finAcces ? `Votre accès Supporter reste ouvert jusqu'au ${dateFr(i.finAcces)}.` : "Votre résiliation est enregistrée.",
        heading: "Résiliation prise en compte",
        blocks: [
          { type: "p", text: bonjour(i.name) },
          { type: "p", text: `Votre abonnement **${LIBELLE[i.formule]}** ne sera pas renouvelé. Aucun autre prélèvement ne sera effectué.` },
          ...(i.finAcces ? [{ type: "note" as const, text: `Vous gardez tous les avantages Supporter jusqu'au **${dateFr(i.finAcces)}**.` }] : []),
          { type: "p", text: "Vous avez changé d'avis ? Vous pouvez réactiver l'abonnement en un clic depuis votre compte, tant que la période n'est pas terminée." },
          { type: "button", label: "Gérer mon abonnement", url: compte },
        ],
        reason: RAISON_ABO,
      }, site);
    case "termine":
      return build("Votre abonnement Supporter est terminé", {
        preheader: "Merci d'avoir soutenu Ambiance Rugby.",
        heading: "Votre abonnement est terminé",
        blocks: [
          { type: "p", text: bonjour(i.name) },
          { type: "p", text: "Votre abonnement Supporter est arrivé à son terme. Merci d'avoir soutenu Ambiance Rugby." },
          { type: "p", text: "Votre compte reste ouvert : scores en direct, calendriers, classements, fiches des clubs et des joueurs restent gratuits." },
          { type: "button", label: "Redevenir Supporter", url: `${site}/abonnement` },
        ],
        reason: RAISON_ABO,
      }, site);
    case "remboursement":
      return build("Votre remboursement est en route", {
        preheader: `${euros(i.montantCents ?? 0)} remboursés sur votre moyen de paiement.`,
        heading: "Remboursement effectué",
        blocks: [
          { type: "p", text: bonjour(i.name) },
          { type: "p", text: `Nous avons remboursé **${euros(i.montantCents ?? 0)}**${i.numero ? ` (facture ${i.numero})` : ""} sur votre moyen de paiement${i.carte ? ` (${i.carte})` : ""}.` },
          ...(i.avoir ? [{ type: "p" as const, text: `L'avoir **${i.avoir}** correspondant est joint à cet e-mail.` }] : []),
          { type: "note", text: "Selon votre banque, le montant apparaît sur votre compte sous 5 à 10 jours ouvrés." },
          ...(i.avoir ? [{ type: "button" as const, label: "Télécharger l'avoir (PDF)", url: `${site}/factures/${encodeURIComponent(i.avoir)}` }] : [{ type: "button" as const, label: "Voir mon compte", url: compte }]),
        ],
        reason: RAISON_ABO,
      }, site);
  }
}

// ---------------------------------------------------------------------
// Boutique
// ---------------------------------------------------------------------

export type BoutiqueTemplate = "commande_confirmee" | "commande_expediee" | "commande_remboursee";
export type BoutiqueInput = {
  name?: string | null;
  numero: string;
  email: string;
  articles: { nom: string; detail?: string; quantite: number; prixCents: number }[];
  livraisonCents: number;
  totalCents: number;
  adresse?: string | null;
  transporteur?: string | null;
  suiviNumero?: string | null;
  suiviUrl?: string | null;
  montantRembourseCents?: number;
  factureNumero?: string | null;
  avoir?: string | null;
};
const RAISON_BOUTIQUE = "Vous recevez cet e-mail suite à votre commande sur la boutique Ambiance Rugby.";

export function boutiqueEmail(template: BoutiqueTemplate, i: BoutiqueInput, siteUrl: string): BuiltEmail {
  const site = siteUrl.replace(/\/$/, "");
  const suivre = `${site}/suivi/${encodeURIComponent(i.numero)}?e=${encodeURIComponent(i.email)}`;
  switch (template) {
    case "commande_confirmee":
      return build(`Commande n° ${i.numero} confirmée`, {
        preheader: `Merci ! ${i.articles.reduce((s, a) => s + a.quantite, 0)} article(s), ${euros(i.totalCents)}.`,
        heading: `Commande n° ${i.numero} confirmée`,
        blocks: [
          { type: "p", text: bonjour(i.name) },
          { type: "p", text: "Merci pour votre commande. Les articles sont fabriqués à la demande : comptez **2 à 5 jours** avant l'expédition. Nous vous écrivons dès que le colis part." },
          { type: "lignes", rows: [
            ...i.articles.map((a) => ({ label: a.nom, detail: [a.detail, `x${a.quantite}`].filter(Boolean).join(" · "), valeur: euros(a.prixCents * a.quantite) })),
            { label: "Livraison", valeur: i.livraisonCents ? euros(i.livraisonCents) : "Offerte" },
          ], total: { label: "Total", valeur: euros(i.totalCents) } },
          ...(i.adresse ? [{ type: "note" as const, text: `**Livraison :** ${i.adresse}` }] : []),
          ...(i.factureNumero ? [{ type: "p" as const, text: `Votre facture **${i.factureNumero}** est jointe à cet e-mail.` }] : []),
          { type: "button", label: "Suivre ma commande", url: suivre },
        ],
        reason: RAISON_BOUTIQUE,
      }, site);
    case "commande_expediee":
      return build("Votre colis est en route", {
        preheader: `Commande n° ${i.numero} expédiée${i.transporteur ? ` avec ${i.transporteur}` : ""}.`,
        heading: "Votre colis est en route",
        blocks: [
          { type: "p", text: bonjour(i.name) },
          { type: "p", text: `Bonne nouvelle : votre commande **n° ${i.numero}** vient d'être expédiée.` },
          { type: "lignes", rows: [
            ...(i.transporteur ? [{ label: "Transporteur", valeur: i.transporteur }] : []),
            ...(i.suiviNumero ? [{ label: "N° de suivi", valeur: i.suiviNumero }] : []),
          ] },
          { type: "button", label: "Suivre mon colis", url: i.suiviUrl || suivre },
        ],
        reason: RAISON_BOUTIQUE,
      }, site);
    case "commande_remboursee":
      return build(`Commande n° ${i.numero} remboursée`, {
        preheader: `${euros(i.montantRembourseCents ?? i.totalCents)} remboursés.`,
        heading: "Remboursement effectué",
        blocks: [
          { type: "p", text: bonjour(i.name) },
          { type: "p", text: `Nous avons remboursé **${euros(i.montantRembourseCents ?? i.totalCents)}** pour votre commande **n° ${i.numero}**, sur le moyen de paiement utilisé.` },
          ...(i.avoir ? [{ type: "p" as const, text: `L'avoir **${i.avoir}** correspondant est joint à cet e-mail.` }] : []),
          { type: "note", text: "Selon votre banque, le montant apparaît sur votre compte sous 5 à 10 jours ouvrés." },
          { type: "button", label: "Voir ma commande", url: suivre },
        ],
        reason: RAISON_BOUTIQUE,
      }, site);
  }
}

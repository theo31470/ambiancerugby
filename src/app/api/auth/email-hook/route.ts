import { after, NextResponse, type NextRequest } from "next/server";
import { verifyStandardWebhook } from "@/lib/email/webhook";
import { authEmail, type AuthTemplate } from "@/lib/email/templates";
import { logSend, sendOnly, siteUrl, type OutgoingEmail, type SendResult } from "@/lib/email/send";

export const dynamic = "force-dynamic";

/**
 * « Send Email Hook » de Supabase Auth : pour chaque e-mail de compte (inscription,
 * mot de passe oublié, changement d'adresse, alertes…), Supabase appelle cette route
 * au lieu d'envoyer son propre e-mail. On construit le message aux couleurs du site
 * et on l'envoie par Resend. Signature vérifiée : seul Supabase peut l'appeler.
 */

type Payload = {
  user: { id: string; email?: string; new_email?: string | null; user_metadata?: Record<string, unknown> | null };
  email_data: { token?: string; token_hash?: string; redirect_to?: string; email_action_type: string; token_hash_new?: string; old_email?: string | null };
};

const SUITE_DEFAUT: Record<string, string> = { recovery: "/compte/nouveau-mot-de-passe", email_change: "/compte/parametres" };

function lienConfirmation(tokenHash: string, type: string, redirectTo: string) {
  const site = siteUrl();
  let suite = SUITE_DEFAUT[type] ?? "/compte";
  try {
    const r = new URL(redirectTo);
    const s = r.searchParams.get("suite");
    if (r.origin === new URL(site).origin && s && s.startsWith("/") && !s.startsWith("//")) suite = s;
  } catch { /* redirect_to absent : destination par défaut */ }
  return `${site}/auth/callback?${new URLSearchParams({ token_hash: tokenHash, type, suite })}`;
}

const echec = (status: number, message: string) => NextResponse.json({ error: { http_code: status, message } }, { status });

export async function POST(request: NextRequest) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secret) return echec(500, "Hook d'envoi non configuré (SEND_EMAIL_HOOK_SECRET absent).");
  const body = await request.text();
  const check = verifyStandardWebhook(body, request.headers, secret);
  if (!check.ok) return echec(401, `Signature refusée : ${check.reason}`);

  let p: Payload;
  try {
    p = JSON.parse(body);
    if (!p?.user?.id || !p?.email_data?.email_action_type) throw new Error();
  } catch {
    return echec(400, "Contenu illisible.");
  }
  const { user, email_data: d } = p;
  const meta = user.user_metadata ?? {};
  const name = typeof meta.display_name === "string" ? meta.display_name : typeof meta.full_name === "string" ? meta.full_name : null;
  const action = d.email_action_type;
  const email = user.email ?? "";
  const th = d.token_hash ?? "", thNew = d.token_hash_new ?? "", redir = d.redirect_to ?? "";

  const messages: { to: string; template: AuthTemplate; url?: string; code?: string; newEmail?: string }[] = [];
  switch (action) {
    case "signup":
    case "recovery":
    case "magiclink":
    case "invite":
      messages.push({ to: email, template: action, url: lienConfirmation(th, action, redir) });
      break;
    case "email":
      messages.push({ to: email, template: "magiclink", url: lienConfirmation(th, "email", redir) });
      break;
    case "email_change": {
      const nouvelle = user.new_email ?? "";
      if (th && thNew) {
        // changement sécurisé : confirmation sur l'ancienne ET la nouvelle adresse (noms de champs inversés côté Supabase)
        messages.push({ to: email, template: "email_change_current", url: lienConfirmation(thNew, "email_change", redir), newEmail: nouvelle });
        if (nouvelle) messages.push({ to: nouvelle, template: "email_change_new", url: lienConfirmation(th, "email_change", redir), newEmail: nouvelle });
      } else if (nouvelle) {
        messages.push({ to: nouvelle, template: "email_change_new", url: lienConfirmation(th || thNew, "email_change", redir), newEmail: nouvelle });
      }
      break;
    }
    case "reauthentication":
      messages.push({ to: email, template: "reauthentication", code: d.token ?? "" });
      break;
    case "email_changed_notification":
      messages.push({ to: d.old_email || email, template: "email_changed_notification", newEmail: email });
      break;
    case "password_changed_notification":
    case "mfa_factor_enrolled_notification":
    case "mfa_factor_unenrolled_notification":
    case "identity_linked_notification":
    case "identity_unlinked_notification":
    case "phone_changed_notification":
      messages.push({ to: email, template: action });
      break;
    default:
      console.warn("[email-hook] type inconnu, ignoré :", action);
      return NextResponse.json({});
  }

  const site = siteUrl();
  const webhookId = request.headers.get("webhook-id") ?? "";
  const sortants: OutgoingEmail[] = messages.filter((m) => m.to).map((m) => ({
    to: m.to, email: authEmail(m.template, { name, url: m.url, code: m.code, newEmail: m.newEmail }, site), kind: "compte", template: m.template, userId: user.id,
  }));
  const resultats: SendResult[] = await Promise.all(sortants.map((m, i) => sendOnly(m, { idempotencyKey: webhookId ? `auth-${webhookId}-${i}` : undefined })));
  // le journal s'écrit après la réponse : Supabase n'attend que quelques secondes
  after(() => Promise.all(sortants.map((m, i) => logSend(m, resultats[i]))));

  const rate = resultats.find((r) => !r.ok);
  if (rate && !rate.ok) {
    console.error("[email-hook] envoi impossible", action, rate.error);
    return echec(500, "L'e-mail n'a pas pu être envoyé. Réessayez dans quelques minutes.");
  }
  return NextResponse.json({});
}

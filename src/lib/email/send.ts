import { shopDb } from "@/lib/shop/admin";
import type { BuiltEmail } from "./templates";

/**
 * Envoi des e-mails par Resend (API HTTP, aucune dépendance).
 * Chaque envoi est noté dans le journal `email_log`.
 */

export type EmailKind = "compte" | "supporter" | "boutique" | "test";
export type OutgoingEmail = {
  to: string; email: BuiltEmail; kind: EmailKind; template: string; userId?: string | null;
  /** Pièces jointes (facture ou avoir PDF), contenu en base64. */
  attachments?: { filename: string; content: string }[];
};
export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

const FROM = () => process.env.EMAIL_FROM?.trim() || "Ambiance Rugby <noreply@ambiance-rugby.fr>";
const REPLY_TO = () => process.env.EMAIL_REPLY_TO?.trim() || null;

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ambiance-rugby.fr").replace(/\/$/, "");

/** Envoie sans écrire le journal (le hook de connexion répond d'abord, journalise ensuite). */
export async function sendOnly(m: OutgoingEmail, opts: { idempotencyKey?: string } = {}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Envoi non configuré (RESEND_API_KEY absente)." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: FROM(), to: [m.to], subject: m.email.subject, html: m.email.html, text: m.email.text,
        ...(REPLY_TO() ? { reply_to: REPLY_TO() } : {}),
        ...(m.attachments?.length ? { attachments: m.attachments } : {}),
        tags: [{ name: "type", value: m.kind }, { name: "modele", value: m.template.replace(/[^A-Za-z0-9_-]/g, "_") }],
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!res.ok) return { ok: false, error: `Resend ${res.status} : ${json?.message ?? res.statusText}`.slice(0, 500) };
    return { ok: true, id: json?.id ?? null };
  } catch (e) {
    return { ok: false, error: `Resend injoignable : ${(e as Error).message}`.slice(0, 500) };
  }
}

export async function logSend(m: OutgoingEmail, r: SendResult) {
  try {
    await shopDb().from("email_log").insert({
      user_id: m.userId ?? null, to_email: m.to, kind: m.kind, template: m.template, subject: m.email.subject.slice(0, 300),
      status: r.ok ? "sent" : "failed", provider_id: r.ok ? r.id : null, error: r.ok ? null : r.error,
    });
  } catch (e) {
    console.error("[email] journal", e);
  }
}

/** Envoie un e-mail et le note dans le journal. Ne lève jamais d'erreur : un e-mail raté ne bloque pas le reste. */
export async function sendEmail(m: OutgoingEmail, opts: { idempotencyKey?: string } = {}): Promise<SendResult> {
  const r = await sendOnly(m, opts);
  if (!r.ok) console.error("[email]", m.template, r.error);
  await logSend(m, r);
  return r;
}

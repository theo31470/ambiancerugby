/**
 * Gabarit HTML des e-mails Ambiance Rugby (même construction que Tracteurs & Co).
 *
 * Les messageries ne comprennent qu'un HTML ancien : mise en page en tableaux,
 * styles écrits sur chaque balise, images en PNG. Aucune dépendance serveur :
 * le studio s'en sert aussi pour l'aperçu.
 */

export const EMAIL_COLORS = {
  page: "#f3ecee",
  card: "#ffffff",
  header: "#3e1621",
  accent: "#f2b53a",
  brand: "#934f5e",
  ink: "#2a1419",
  text: "#433036",
  muted: "#7a6166",
  line: "#ecd9dd",
  soft: "#f8f1f3",
  danger: "#b3261e",
  dangerSoft: "#fbeae8",
} as const;

const C = EMAIL_COLORS;
const FONT = "'Instrument Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const DISPLAY = "'Bricolage Grotesque', 'Segoe UI', Helvetica, Arial, sans-serif";

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Texte simple avec **gras** autorisé (tout le reste est échappé). */
function rich(text: string) {
  return escapeHtml(text)
    .replace(/Ambiance Rugby/g, "Ambiance&nbsp;Rugby")
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${C.ink};font-weight:700">$1</strong>`)
    .replace(/\n/g, "<br>");
}
const plain = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "$1");

/** Ligne d'un récapitulatif : libellé (+ précision) à gauche, valeur à droite. */
export type Ligne = { label: string; detail?: string; valeur?: string };

export type EmailBlock =
  | { type: "p"; text: string }
  | { type: "button"; label: string; url: string }
  | { type: "code"; value: string }
  | { type: "note"; text: string; tone?: "info" | "danger" }
  | { type: "lignes"; rows: Ligne[]; total?: { label: string; valeur: string } }
  | { type: "fallback"; url: string };

export type EmailContent = {
  /** Aperçu affiché sous l'objet dans la boîte de réception. */
  preheader: string;
  heading: string;
  blocks: EmailBlock[];
  /** Pourquoi la personne reçoit ce message (pied de page). */
  reason: string;
  /** Lien « gérer mes e-mails » (alertes et annonces seulement). */
  preferencesUrl?: string;
};

export type RenderedEmail = { html: string; text: string };

function blockHtml(b: EmailBlock): string {
  switch (b.type) {
    case "p":
      return `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.text}">${rich(b.text)}</p>`;
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr><td style="border-radius:10px;background:${C.brand}" bgcolor="${C.brand}"><a href="${escapeHtml(b.url)}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:16px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(b.label)}&nbsp;&rarr;</a></td></tr></table>`;
    case "code":
      return `<p style="margin:4px 0 24px;padding:16px 20px;background:${C.soft};border:1px solid ${C.line};border-radius:12px;font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:${C.ink};text-align:center">${escapeHtml(b.value)}</p>`;
    case "note": {
      const danger = b.tone === "danger";
      return `<p style="margin:0 0 16px;padding:12px 16px;border-left:4px solid ${danger ? C.danger : C.accent};background:${danger ? C.dangerSoft : C.soft};border-radius:6px;font-family:${FONT};font-size:14px;line-height:1.55;color:${C.text}">${rich(b.text)}</p>`;
    }
    case "lignes": {
      const rows = b.rows
        .map((r) => `<tr><td style="padding:12px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:15px;line-height:1.4;color:${C.text}"><strong style="color:${C.ink}">${escapeHtml(r.label)}</strong>${r.detail ? `<br><span style="color:${C.muted};font-size:14px">${escapeHtml(r.detail)}</span>` : ""}</td><td align="right" style="padding:12px 0 12px 12px;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:15px;font-weight:600;color:${C.ink};white-space:nowrap;vertical-align:middle">${escapeHtml(r.valeur ?? "")}</td></tr>`)
        .join("");
      const total = b.total
        ? `<tr><td style="padding:14px 0 0;font-family:${DISPLAY};font-size:17px;font-weight:800;color:${C.ink}">${escapeHtml(b.total.label)}</td><td align="right" style="padding:14px 0 0;font-family:${DISPLAY};font-size:20px;font-weight:800;color:${C.ink};white-space:nowrap">${escapeHtml(b.total.valeur)}</td></tr>`
        : "";
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-top:1px solid ${C.line}">${rows}${total}</table>`;
    }
    case "fallback":
      return `<p style="margin:0 0 16px;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.muted}">Le bouton ne marche pas ? Copiez ce lien dans votre navigateur :<br><a href="${escapeHtml(b.url)}" style="color:${C.brand};word-break:break-all">${escapeHtml(b.url)}</a></p>`;
  }
}

function blockText(b: EmailBlock): string {
  switch (b.type) {
    case "p":
    case "note":
      return plain(b.text);
    case "button":
      return `${b.label} :\n${b.url}`;
    case "code":
      return b.value;
    case "lignes":
      return [...b.rows.map((r) => `- ${r.label}${r.detail ? ` (${r.detail})` : ""}${r.valeur ? ` : ${r.valeur}` : ""}`), ...(b.total ? [`${b.total.label} : ${b.total.valeur}`] : [])].join("\n");
    case "fallback":
      return "";
  }
}

export function renderEmail(content: EmailContent, opts: { siteUrl: string }): RenderedEmail {
  const site = opts.siteUrl.replace(/\/$/, "");
  const logo = `${site}/logo-blanc.png`;
  const body = content.blocks.map(blockHtml).join("\n");
  const prefs = content.preferencesUrl
    ? ` · <a href="${escapeHtml(content.preferencesUrl)}" style="color:${C.muted};text-decoration:underline">Gérer mes e-mails</a>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(content.heading)}</title>
<style>
  @media (max-width:620px){ .ar-pad{padding-left:22px!important;padding-right:22px!important} .ar-h1{font-size:24px!important} }
  a{color:${C.brand}}
</style>
</head>
<body style="margin:0;padding:0;background:${C.page}" bgcolor="${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(content.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page}">
<tr><td align="center" style="padding:28px 12px 36px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
    <tr><td class="ar-pad" bgcolor="${C.header}" style="background:${C.header};padding:22px 36px;border-radius:16px 16px 0 0">
      <a href="${site}" target="_blank" style="text-decoration:none"><img src="${logo}" height="48" alt="Ambiance Rugby" style="display:block;border:0;height:48px;width:auto;color:#ffffff;font-family:${DISPLAY};font-size:20px;font-weight:800"></a>
    </td></tr>
    <tr><td height="4" bgcolor="${C.accent}" style="background:${C.accent};height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>
    <tr><td class="ar-pad" bgcolor="${C.card}" style="background:${C.card};padding:36px 36px 20px;border-radius:0 0 16px 16px">
      <h1 class="ar-h1" style="margin:0 0 20px;font-family:${DISPLAY};font-size:28px;line-height:1.2;font-weight:800;color:${C.ink}">${escapeHtml(content.heading)}</h1>
      ${body}
    </td></tr>
    <tr><td class="ar-pad" style="padding:22px 36px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted}">
      ${escapeHtml(content.reason)}<br>
      <strong style="color:${C.text}">Ambiance Rugby</strong> · Média rugby indépendant · <a href="${site}" style="color:${C.muted};text-decoration:underline">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a>${prefs}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    content.heading.toUpperCase(),
    "",
    ...content.blocks.map(blockText).filter(Boolean).flatMap((t) => [t, ""]),
    "—",
    content.reason,
    `Ambiance Rugby · Média rugby indépendant · ${site}`,
    content.preferencesUrl ? `Gérer mes e-mails : ${content.preferencesUrl}` : "",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n")
    .trim();

  return { html, text };
}

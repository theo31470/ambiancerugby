/** Déduit le canal d'arrivée d'un visiteur : paramètres utm, site d'origine, ou navigateur intégré d'une appli. */
export type Arrivee = { canal: string; source: string | null };

const RESEAUX: [RegExp, string][] = [
  [/tiktok|musical\.ly|bytedance/, "TikTok"],
  [/instagram/, "Instagram"],
  [/facebook|^fb$|fb\.com|fbclid|messenger/, "Facebook"],
  [/(^|\.)t\.co$|twitter|(^|\.)x\.com$/, "X"],
  [/snapchat/, "Snapchat"],
  [/youtube|youtu\.be/, "YouTube"],
  [/whatsapp|wa\.me/, "WhatsApp"],
  [/linkedin|lnkd\.in/, "LinkedIn"],
  [/reddit/, "Reddit"],
  [/threads\.net/, "Threads"],
  [/pinterest/, "Pinterest"],
  [/discord/, "Discord"],
  [/telegram|t\.me/, "Telegram"],
];
const MOTEURS: [RegExp, string][] = [
  [/(^|\.)google\.|googlequicksearch|android-app:\/\/com\.google/, "Google"],
  [/bing\.|duckduckgo|qwant|ecosia|yahoo|yandex|brave\.|startpage|lilo|perplexity|chatgpt|openai|claude\.ai/, "Autres moteurs"],
];
const EMAIL = /mail\.|gmail|outlook|live\.com|yahoo\.com\/mail|webmail|android-app:\/\/com\.google\.android\.gm/;

export function arrivee(ref: string | null, ua: string, utm: { source?: string | null; medium?: string | null }, hoteSite: string): Arrivee {
  const s = utm.source?.toLowerCase().trim();
  if (s) {
    for (const [re, nom] of RESEAUX) if (re.test(s)) return { canal: nom, source: utm.source! };
    if (/mail|newsletter/.test(s) || /mail/.test(utm.medium ?? "")) return { canal: "E-mail", source: utm.source! };
    for (const [re, nom] of MOTEURS) if (re.test(s)) return { canal: nom, source: utm.source! };
    return { canal: "Campagnes", source: utm.source! };
  }
  // les applis ouvrent les liens dans leur propre navigateur, souvent sans site d'origine
  const u = ua.toLowerCase();
  if (/musical_ly|bytedancewebview|tiktok|trill_/.test(u)) return { canal: "TikTok", source: "tiktok.com" };
  if (/instagram/.test(u)) return { canal: "Instagram", source: "instagram.com" };
  if (/fban|fbav|fb_iab|messenger/.test(u)) return { canal: "Facebook", source: "facebook.com" };
  if (/snapchat/.test(u)) return { canal: "Snapchat", source: "snapchat.com" };
  if (/linkedinapp/.test(u)) return { canal: "LinkedIn", source: "linkedin.com" };
  if (!ref) return { canal: "Direct", source: null };
  let hote = ref;
  try { hote = ref.startsWith("android-app://") ? ref : new URL(ref).hostname.replace(/^www\./, ""); } catch { /* garde tel quel */ }
  if (hote === hoteSite || hote.endsWith(`.${hoteSite}`)) return { canal: "Direct", source: null };
  for (const [re, nom] of RESEAUX) if (re.test(hote)) return { canal: nom, source: hote };
  for (const [re, nom] of MOTEURS) if (re.test(hote)) return { canal: nom, source: hote };
  if (EMAIL.test(hote)) return { canal: "E-mail", source: hote };
  return { canal: "Autres sites", source: hote };
}

export function appareilDe(ua: string): { appareil: string; os: string; navigateur: string } {
  const u = ua.toLowerCase();
  const appareil = /ipad|tablet|(android(?!.*mobile))/.test(u) ? "Tablette" : /mobi|iphone|ipod|android/.test(u) ? "Mobile" : "Ordinateur";
  const os = /iphone|ipad|ipod/.test(u) ? "iOS" : /android/.test(u) ? "Android" : /windows/.test(u) ? "Windows" : /mac os/.test(u) ? "macOS" : /cros/.test(u) ? "ChromeOS" : /linux/.test(u) ? "Linux" : "Autre";
  const navigateur = /musical_ly|bytedance|tiktok/.test(u) ? "TikTok (intégré)" : /instagram/.test(u) ? "Instagram (intégré)" : /fban|fbav/.test(u) ? "Facebook (intégré)"
    : /edg\//.test(u) ? "Edge" : /samsungbrowser/.test(u) ? "Samsung Internet" : /opr\/|opera/.test(u) ? "Opera" : /firefox|fxios/.test(u) ? "Firefox"
    : /crios|chrome/.test(u) ? "Chrome" : /safari/.test(u) ? "Safari" : "Autre";
  return { appareil, os, navigateur };
}

export const ROBOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp\/|telegrambot|discordbot|headless|lighthouse|pingdom|uptime|vercel|python|curl|wget|axios|node-fetch|go-http|java\//i;

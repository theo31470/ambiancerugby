import type { MatchStatus } from "./types";

export const TZ = "Europe/Paris";

export function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
}

export function fmtDay(iso: string | Date, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("fr-FR", { ...opts, timeZone: TZ }).format(new Date(iso));
}

export function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
}

export function fmtRelative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `il y a ${Math.floor(diff / 86400)} j`;
  return fmtDate(iso);
}

/** Date du jour (YYYY-MM-DD) à Paris. */
export function parisToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Décalage (minutes) de Paris par rapport à UTC à un instant donné. */
function parisOffset(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const v = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return (asUtc - at.getTime()) / 60000;
}

/** Bornes UTC d'une journée à Paris. */
export function parisDayRange(day: string) {
  const naive = new Date(`${day}T00:00:00Z`);
  const start = new Date(naive.getTime() - parisOffset(naive) * 60000);
  const nextNaive = new Date(naive.getTime() + 86400000);
  const end = new Date(nextNaive.getTime() - parisOffset(nextNaive) * 60000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function shiftDay(day: string, delta: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Convertit une valeur <input type="datetime-local"> (heure de Paris) en ISO UTC. */
export function parisLocalToIso(local: string) {
  const naive = new Date(`${local}:00Z`);
  return new Date(naive.getTime() - parisOffset(naive) * 60000).toISOString();
}

/** ISO UTC → valeur <input type="datetime-local"> en heure de Paris. */
export function isoToParisLocal(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() + parisOffset(d) * 60000).toISOString().slice(0, 16);
}

export const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "À venir",
  live: "En direct",
  halftime: "Mi-temps",
  finished: "Terminé",
  postponed: "Reporté",
  cancelled: "Annulé",
};

export const isLive = (s: MatchStatus) => s === "live" || s === "halftime";

export const POSITIONS: Record<string, string> = {
  pilier: "Pilier",
  talonneur: "Talonneur",
  "deuxieme-ligne": "Deuxième ligne",
  "troisieme-ligne": "Troisième ligne",
  "demi-de-melee": "Demi de mêlée",
  "demi-d-ouverture": "Demi d'ouverture",
  centre: "Centre",
  ailier: "Ailier",
  arriere: "Arrière",
};

export const POSITION_GROUPS: { label: string; positions: string[] }[] = [
  { label: "Première ligne", positions: ["pilier", "talonneur"] },
  { label: "Deuxième ligne", positions: ["deuxieme-ligne"] },
  { label: "Troisième ligne", positions: ["troisieme-ligne"] },
  { label: "Charnière", positions: ["demi-de-melee", "demi-d-ouverture"] },
  { label: "Trois-quarts", positions: ["centre", "ailier", "arriere"] },
];

export const CATEGORIES: Record<string, string> = {
  actu: "Actu",
  analyse: "Analyse",
  interview: "Interview",
  transfert: "Transferts",
  video: "Vidéo",
  "avant-match": "Avant-match",
  "apres-match": "Après-match",
};

export const EVENT_LABEL: Record<string, string> = {
  try: "Essai",
  conversion: "Transformation",
  penalty: "Pénalité",
  drop: "Drop",
  penalty_try: "Essai de pénalité",
  yellow: "Carton jaune",
  red: "Carton rouge",
  sub: "Remplacement",
  note: "Fait de jeu",
};

export const EVENT_POINTS: Record<string, number> = { try: 5, conversion: 2, penalty: 3, drop: 3, penalty_try: 7 };

export function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function age(birth: string | null) {
  if (!birth) return null;
  const b = new Date(birth);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

export function teamLabel(t: { short_name: string | null; name: string }) {
  return t.short_name || t.name;
}

/** Instant (ISO UTC) décalé de `ms` millisecondes par rapport à maintenant. */
export function isoFromNow(ms: number) {
  return new Date(Date.now() + ms).toISOString();
}

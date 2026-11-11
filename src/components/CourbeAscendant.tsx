import { EVENT_POINTS } from "@/lib/format";

type Evt = { minute: number | null; kind: string; team_id: string | null; player?: unknown };
type Equipe = { id: string; name: string; short_name: string | null };

/**
 * Courbe d'ascendant : qui pousse, minute par minute. Chaque action pèse (essai, pénalité, carton…)
 * et son effet s'estompe avec le temps : au-dessus de la ligne, l'équipe qui reçoit domine ;
 * en dessous, les visiteurs. Calculée à partir du fil du match, elle avance en direct.
 */
const POIDS: Record<string, number> = { try: 6, penalty_try: 8, conversion: 1.2, penalty: 3, drop: 3.5, yellow: -3.5, red: -6 };
const TAU = 7; // minutes : vitesse à laquelle un temps fort s'estompe
const W = 800, H = 190, MID = H / 2;

export default function CourbeAscendant({ events, home, away, minuteActuelle, full = true }: { events: Evt[]; home: Equipe; away: Equipe; minuteActuelle: number; full?: boolean }) {
  const utiles = events.filter((e) => e.minute != null && e.team_id && POIDS[e.kind] !== undefined);
  if (utiles.length < 2) return null;
  const fin = Math.max(40, Math.min(90, Math.max(minuteActuelle, ...utiles.map((e) => e.minute ?? 0))));
  const pas = 0.5;
  const valeurs: number[] = [];
  for (let t = 0; t <= fin; t += pas) {
    let v = 0;
    for (const e of utiles) {
      const dt = t - (e.minute ?? 0);
      if (dt < 0) continue;
      v += (e.team_id === home.id ? 1 : -1) * POIDS[e.kind] * Math.exp(-dt / TAU);
    }
    valeurs.push(v);
  }
  const max = Math.max(6, ...valeurs.map(Math.abs));
  const x = (t: number) => (t / 80) * W * (80 / Math.max(80, fin));
  const y = (v: number) => MID - (v / max) * (MID - 12);
  const points = valeurs.map((v, i) => `${x(i * pas).toFixed(1)},${y(v).toFixed(1)}`);
  const chemin = `M${x(0)},${MID} L${points.join(" L")} L${x(fin)},${MID} Z`;

  // part du temps passé à dominer, et le plus long temps fort
  const domH = valeurs.filter((v) => v > 0.8).length, domA = valeurs.filter((v) => v < -0.8).length;
  const tot = Math.max(1, domH + domA);
  let meilleur = { equipe: home, debut: 0, duree: 0 };
  let cours = { signe: 0, debut: 0 };
  valeurs.forEach((v, i) => {
    const s = v > 0.8 ? 1 : v < -0.8 ? -1 : 0;
    if (s !== cours.signe) cours = { signe: s, debut: i };
    if (s !== 0 && (i - cours.debut) * pas > meilleur.duree) meilleur = { equipe: s > 0 ? home : away, debut: cours.debut * pas, duree: (i - cours.debut) * pas };
  });
  const nom = (t: Equipe) => t.short_name ?? t.name;
  const pctH = Math.round((domH / tot) * 100);
  const marques = utiles.filter((e) => (EVENT_POINTS[e.kind] ?? 0) >= 3 || e.kind === "yellow" || e.kind === "red");

  return (
    <section aria-labelledby="h-ascendant" className="mt-10 max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <h2 id="h-ascendant" className="groovy text-2xl text-vin">La courbe d&apos;ascendant</h2>
        <p className="text-sm text-sourdine">Qui pousse, minute par minute</p>
      </div>
      <div className="relative bg-surface border border-trait rounded-2xl p-4 overflow-hidden">
        {!full && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-surface/40 backdrop-blur-[6px] p-4 text-center">
            <p className="max-w-sm font-semibold">La courbe d&apos;ascendant, la part de domination et les temps forts sont réservés aux Supporters.
              <a href="/abonnement" className="block mt-3 bouton-or justify-center">Devenir Supporter</a></p>
          </div>
        )}
        <div aria-hidden={!full || undefined} className={full ? "" : "select-none"}>
        <div className="flex justify-between text-xs font-bold mb-1">
          <span className="text-vin">▲ {nom(home)} domine</span>
          <span className="text-sourdine tnum">{pctH} % / {100 - pctH} %</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
          aria-label={`${nom(home)} a dominé ${pctH} % du temps de jeu, ${nom(away)} ${100 - pctH} %. Plus long temps fort : ${nom(meilleur.equipe)}, ${Math.round(meilleur.duree)} minutes à partir de la ${Math.round(meilleur.debut)}e.`}>
          <defs>
            <clipPath id="haut"><rect x="0" y="0" width={W} height={MID} /></clipPath>
            <clipPath id="bas"><rect x="0" y={MID} width={W} height={MID} /></clipPath>
          </defs>
          {/* repères : mi-temps et quarts d'heure */}
          {[20, 40, 60, 80].map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={6} y2={H - 6} stroke="var(--trait)" strokeWidth={t === 40 ? 2 : 1} strokeDasharray={t === 40 ? "" : "3 5"} />
              <text x={x(t) - 4} y={H - 8} textAnchor="end" fontSize="11" fill="var(--sourdine)">{t === 40 ? "MT" : `${t}'`}</text>
            </g>
          ))}
          <line x1={0} x2={x(fin)} y1={MID} y2={MID} stroke="var(--sourdine)" strokeOpacity={0.4} />
          <path d={chemin} fill="var(--vin)" fillOpacity={0.85} clipPath="url(#haut)" />
          <path d={chemin} fill="var(--moutarde)" fillOpacity={0.9} clipPath="url(#bas)" />
          {/* points marqués et cartons */}
          {marques.map((e, i) => {
            const dom = e.team_id === home.id;
            const cx = x(e.minute ?? 0), cy = dom ? 12 : H - 26;
            const carton = e.kind === "yellow" || e.kind === "red";
            return carton
              ? <rect key={i} x={cx - 3.5} y={cy - 5} width={7} height={10} rx={1.5} fill={e.kind === "red" ? "var(--alerte)" : "#f5c518"} stroke="var(--encre)" strokeOpacity={0.3} />
              : <circle key={i} cx={cx} cy={cy} r={e.kind === "try" || e.kind === "penalty_try" ? 5 : 3.5} fill={dom ? "var(--vin)" : "var(--moutarde)"} stroke="var(--surface)" strokeWidth={1.5} />;
          })}
        </svg>
        <div className="flex justify-between text-xs font-bold mt-1">
          <span className="text-[color-mix(in_srgb,var(--moutarde)_70%,var(--encre))]">▼ {nom(away)} domine</span>
          {minuteActuelle < 80 && <span className="text-sourdine">jusqu&apos;à la {Math.round(minuteActuelle)}e</span>}
        </div>
        </div>
        {full && meilleur.duree >= 4 && (
          <p className="mt-3 text-sm">
            Plus long temps fort : <b>{nom(meilleur.equipe)}</b>, {Math.round(meilleur.duree)} minutes de domination à partir de la {Math.max(1, Math.round(meilleur.debut))}<sup>e</sup>.
          </p>
        )}
      </div>
    </section>
  );
}

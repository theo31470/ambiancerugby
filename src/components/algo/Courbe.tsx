/** Courbe de l'Indice Ambiance d'un club au fil des matchs (SVG, sans dépendance). */
export default function Courbe({ points }: { points: { played_at: string; rating: number }[] }) {
  if (points.length < 2) return <p className="text-sm text-sourdine">La courbe apparaît après deux matchs.</p>;
  const W = 600, H = 180, P = 24;
  const vals = points.map((p) => p.rating);
  const min = Math.min(...vals, 1500) - 15;
  const max = Math.max(...vals, 1500) + 15;
  const x = (i: number) => P + (i / (points.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / (max - min)) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Indice Ambiance de ${Math.round(points[0].rating)} à ${Math.round(last.rating)} sur ${points.length} matchs`}>
      <line x1={P} x2={W - P} y1={y(1500)} y2={y(1500)} stroke="var(--trait)" strokeDasharray="4 4" />
      <text x={W - P} y={y(1500) - 6} textAnchor="end" fontSize="11" fill="var(--sourdine)">1500, niveau moyen</text>
      <path d={`${d} L${x(points.length - 1)},${H - P} L${x(0)},${H - P} Z`} fill="var(--vin)" opacity=".08" />
      <path d={d} fill="none" stroke="var(--vin)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.rating)} r="3.5" fill="var(--surface)" stroke="var(--vin)" strokeWidth="2"><title>{`${new Date(p.played_at).toLocaleDateString("fr-FR")} : ${Math.round(p.rating)}`}</title></circle>)}
      <circle cx={x(points.length - 1)} cy={y(last.rating)} r="6" fill="var(--moutarde)" stroke="var(--vin)" strokeWidth="2" />
    </svg>
  );
}

/** Une fois de temps en temps, deux rennes traversent l'écran en tirant un ballon emballé en cadeau. */
export default function Traineau() {
  return (
    <div className="noel-traineau pointer-events-none fixed left-0 top-28 lg:top-36 z-30" aria-hidden>
      <svg width="230" height="70" viewBox="0 0 230 70" className="w-40 lg:w-56 h-auto">
        <g fill="#f2b53a" opacity=".9"><circle cx="-6" cy="44" r="2" /><circle cx="-16" cy="48" r="1.5" /><circle cx="-26" cy="45" r="1" /></g>
        <path d="M6 50 H96 Q110 50 108 38" stroke="#3e1621" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M14 46 Q12 28 30 26 H82 Q94 26 96 46Z" fill="#c0392b" /><path d="M30 26 H82" stroke="#f2b53a" strokeWidth="3" />
        <g className="noel-rebond"><g transform="translate(56 18) rotate(-16) scale(1.3)"><use href="#noel-ballon" /></g><path d="M54 8 C48 2 44 8 52 10 M58 8 C62 1 68 6 60 10" stroke="#f2b53a" strokeWidth="2.5" fill="none" /></g>
        <path d="M100 36 L140 34 M100 40 L176 36" stroke="#3e1621" strokeWidth="1.6" />
        {[[130, 18, "#c0392b"], [172, 14, "#3e1621"]].map(([x, y, nez]) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            <ellipse cx="14" cy="18" rx="15" ry="8" fill="#8a5a3c" /><path d="M4 24 V34 M24 24 V34" stroke="#8a5a3c" strokeWidth="3" />
            <circle cx="29" cy="9" r="6" fill="#8a5a3c" /><circle cx="34" cy="10" r="2.2" fill={nez as string} />
            <path d="M27 4 L24 -4 M24 0 L20 -2 M30 4 L32 -4 M32 -1 L36 -3" stroke="#6b4226" strokeWidth="1.6" fill="none" />
          </g>
        ))}
      </svg>
    </div>
  );
}

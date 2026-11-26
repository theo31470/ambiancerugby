/** Formes partagées du décor de Noël (dégradés de neige, ballon, bonnets, visage…), réutilisées par <use href>. */
export default function DefsNoel() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <radialGradient id="noel-boule" cx="38%" cy="30%" r="75%"><stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#eef3f8" /><stop offset="1" stopColor="#c9d6e4" /></radialGradient>
        <linearGradient id="noel-couche" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" /><stop offset=".55" stopColor="#f6f9fc" /><stop offset="1" stopColor="#d9e4ef" /></linearGradient>
        <linearGradient id="noel-glace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eef6ff" stopOpacity=".95" /><stop offset="1" stopColor="#cfe2f5" stopOpacity=".15" /></linearGradient>
        <radialGradient id="noel-cuir" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#b56a7a" /><stop offset="1" stopColor="#6e3442" /></radialGradient>
        <pattern id="noel-sucre" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="10" height="10" fill="#fff" /><rect width="4.5" height="10" fill="#c0392b" /></pattern>
        <g id="noel-ballon"><ellipse rx="13" ry="8.5" fill="url(#noel-cuir)" /><path d="M-6 -1.5 H6" stroke="#fff" strokeWidth="1.4" /><path d="M-4 -3.4 V.4 M-1.3 -3.4 V.4 M1.3 -3.4 V.4 M4 -3.4 V.4" stroke="#fff" strokeWidth=".9" /><path d="M-11 -2 Q0 -7 11 -2" stroke="#ffffff55" strokeWidth="1" fill="none" /></g>
        <g id="noel-bonnet"><path d="M2 40 Q4 6 36 4 Q52 3 56 24 Q60 36 62 40Z" fill="#c0392b" /><rect y="36" width="64" height="14" rx="7" fill="#fff" /><circle cx="58" cy="10" r="8" fill="#fff" /></g>
        <g id="noel-bonnet-laine"><path d="M-14 0 Q-14 -18 0 -18 Q14 -18 14 0Z" fill="#934f5e" /><path d="M-13.5 -6 H13.5 M-11 -12 H11" stroke="#f2b53a" strokeWidth="2.6" /><rect x="-15" y="-3" width="30" height="6" rx="3" fill="#f2b53a" /><circle cy="-20" r="4.5" fill="#f2b53a" /></g>
        <g id="noel-cadeau"><rect x="2" y="9" width="20" height="14" rx="2" fill="#c0392b" /><rect x="1" y="6" width="22" height="5" rx="1.5" fill="#e04a3a" /><rect x="10.5" y="6" width="3" height="17" fill="#f2b53a" /><path d="M12 6 C6 -1 2 4 8 6 M12 6 C18 -1 22 4 16 6" stroke="#f2b53a" strokeWidth="2.2" fill="none" /><path d="M1 6.5 Q12 3 23 6.5 L23 7 Q12 5 1 7Z" fill="#fff" /></g>
        <g id="noel-grelot"><circle cx="9" cy="11" r="7" fill="currentColor" /><rect x="7.5" y="1" width="3" height="4" rx="1" fill="currentColor" /><path d="M4 12 H14" stroke="#f2b53a" strokeWidth="1.6" /><circle cx="9" cy="15" r="1.4" fill="#f2b53a" /></g>
        <g id="noel-sapin-blanc"><path d="M20 2 L34 22 H26 L38 40 H28 L42 62 H-2 L12 40 H2 L14 22 H6Z" fill="#fff" /><rect x="17" y="62" width="6" height="8" fill="#f2b53a" /><circle cx="20" cy="2" r="3.2" fill="#f2b53a" /><circle cx="14" cy="30" r="2.4" fill="#c0392b" /><circle cx="26" cy="46" r="2.4" fill="#f2b53a" /></g>
        <g id="noel-visage"><circle cx="-4.5" cy="-2" r="1.7" fill="#2a1419" /><circle cx="4.5" cy="-2" r="1.7" fill="#2a1419" /><path d="M0 1 L11 3 L0 4.2Z" fill="#ef8a2b" /><g fill="#2a1419"><circle cx="-5" cy="6" r=".9" /><circle cx="-2" cy="7.4" r=".9" /><circle cx="1.5" cy="7.6" r=".9" /><circle cx="4.6" cy="6.4" r=".9" /></g></g>
        <g id="noel-echarpe"><path d="M-13 0 Q0 7 13 0 L13.5 5 Q0 12 -13.5 5Z" fill="#934f5e" /><path d="M-6 3.5 L-5 9 M1 5 L1.5 10.5" stroke="#f2b53a" strokeWidth="2" /><path d="M7 4 L10 18 L15 16 L11 3Z" fill="#934f5e" /><path d="M9 11 L13.5 9.6" stroke="#f2b53a" strokeWidth="2" /></g>
      </defs>
    </svg>
  );
}

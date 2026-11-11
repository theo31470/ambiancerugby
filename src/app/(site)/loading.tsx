/** Pendant les chargements : une pinte qui se remplit. */
export default function Loading() {
  return (
    <div className="min-h-[50vh] grid place-items-center" role="status" aria-label="Chargement">
      <div className="flex flex-col items-center gap-3">
        <svg viewBox="0 0 40 56" className="w-14 h-auto text-bordeaux" aria-hidden>
          <defs>
            <clipPath id="verre"><path d="M7 11h22l-3 41a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2z" /></clipPath>
          </defs>
          <g clipPath="url(#verre)">
            <rect className="pinte-biere" x="0" y="14" width="40" height="42" fill="#f2b53a" />
          </g>
          <path className="pinte-mousse" d="M5 13c0-4 4-6 7-5 2-3 8-3 10 0 4-1 8 1 8 5 0 2-2 3-3 3H8c-2 0-3-1-3-3z" fill="#fff" stroke="currentColor" strokeWidth="2" />
          <path d="M6 10h24l-3 42a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M30 18h4a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-5" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
        <p className="groovy text-xl text-vin">On remplit les verres…</p>
      </div>
    </div>
  );
}

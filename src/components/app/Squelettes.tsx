/** Squelettes de chargement : la forme de la page arrive tout de suite, le contenu se glisse dedans. */
const B = ({ className = "" }: { className?: string }) => <div aria-hidden className={`squelette rounded-xl ${className}`} />;

function Cadre({ children, label }: { children: React.ReactNode; label: string }) {
  return <div role="status" aria-label={label} className="animate-[apparait_.25s_ease-out_.12s_both]">{children}</div>;
}

/** Liste de matchs (page Matchs, compétition). */
export function SqueletteMatchs() {
  return (
    <Cadre label="Chargement des matchs">
      <B className="h-10 w-48 mb-5" />
      <div className="flex gap-2 mb-6 overflow-hidden">{Array.from({ length: 7 }, (_, i) => <B key={i} className="h-16 w-14 shrink-0 rounded-2xl" />)}</div>
      {Array.from({ length: 3 }, (_, g) => (
        <div key={g} className="mb-6">
          <B className="h-5 w-40 mb-3" />
          <div className="bg-surface border border-trait rounded-2xl divide-y divide-trait overflow-hidden">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <B className="w-8 h-8 rounded-full" /><B className="h-4 flex-1 max-w-36" /><B className="h-6 w-14" /><B className="h-4 flex-1 max-w-36" /><B className="w-8 h-8 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </Cadre>
  );
}

/** Fiche match : tableau d'affichage, onglets, contenu. */
export function SqueletteMatch() {
  return (
    <Cadre label="Chargement du match">
      <B className="h-4 w-52 mb-4" />
      <div className="rounded-3xl bg-bordeaux/90 px-5 py-8 sm:py-12 flex items-center justify-between gap-4">
        <div className="flex flex-col items-center gap-3 flex-1"><div className="w-16 h-16 rounded-full bg-white/10" /><div className="h-4 w-24 rounded-lg bg-white/10" /></div>
        <div className="h-16 w-36 rounded-2xl bg-white/10" />
        <div className="flex flex-col items-center gap-3 flex-1"><div className="w-16 h-16 rounded-full bg-white/10" /><div className="h-4 w-24 rounded-lg bg-white/10" /></div>
      </div>
      <div className="mt-6 flex gap-2">{Array.from({ length: 4 }, (_, i) => <B key={i} className="h-10 w-28 rounded-full" />)}</div>
      <div className="mt-6 grid gap-3">{Array.from({ length: 5 }, (_, i) => <B key={i} className="h-16" />)}</div>
    </Cadre>
  );
}

/** Fiche joueur ou club : en-tête avec photo, chiffres clés, tableau. */
export function SqueletteFiche({ label = "Chargement de la fiche" }: { label?: string }) {
  return (
    <Cadre label={label}>
      <div className="flex items-center gap-5">
        <B className="w-24 h-24 sm:w-32 sm:h-32 rounded-full shrink-0" />
        <div className="flex-1 grid gap-3"><B className="h-4 w-24" /><B className="h-10 w-3/4 max-w-sm" /><B className="h-5 w-40" /></div>
      </div>
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 4 }, (_, i) => <B key={i} className="h-20" />)}</div>
      <B className="mt-8 h-8 w-48" />
      <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-3">{Array.from({ length: 12 }, (_, i) => <B key={i} className="h-16" />)}</div>
    </Cadre>
  );
}

/** Classement d'une compétition. */
export function SqueletteClassement() {
  return (
    <Cadre label="Chargement de la compétition">
      <div className="flex items-center gap-4 mb-6"><B className="w-16 h-16 rounded-2xl" /><B className="h-10 w-64" /></div>
      <div className="flex gap-2 mb-5">{Array.from({ length: 4 }, (_, i) => <B key={i} className="h-10 w-28 rounded-full" />)}</div>
      <div className="bg-surface border border-trait rounded-2xl divide-y divide-trait overflow-hidden">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3"><B className="w-5 h-4" /><B className="w-7 h-7 rounded-full" /><B className="h-4 flex-1 max-w-48" /><B className="h-4 w-24 ml-auto" /></div>
        ))}
      </div>
    </Cadre>
  );
}

/** Liste d'articles. */
export function SqueletteActus() {
  return (
    <Cadre label="Chargement des actus">
      <B className="h-10 w-40 mb-6" />
      <B className="h-56 sm:h-80 rounded-3xl" />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="grid gap-3"><B className="aspect-[16/10] rounded-2xl" /><B className="h-5 w-11/12" /><B className="h-4 w-2/3" /></div>)}
      </div>
    </Cadre>
  );
}

/** Article. */
export function SqueletteArticle() {
  return (
    <Cadre label="Chargement de l'article">
      <div className="max-w-3xl">
        <B className="h-4 w-32" /><B className="mt-4 h-12 w-full" /><B className="mt-2 h-12 w-2/3" />
        <B className="mt-6 aspect-[16/9] rounded-3xl" />
        <div className="mt-6 grid gap-3">{Array.from({ length: 6 }, (_, i) => <B key={i} className={`h-4 ${i % 3 === 2 ? "w-3/4" : "w-full"}`} />)}</div>
      </div>
    </Cadre>
  );
}

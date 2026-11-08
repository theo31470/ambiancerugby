import type { ReactNode } from "react";

/** En-tête d'une page de l'admin : à quoi sert la page, et ses actions principales toujours visibles. */
export default function PageHeader({ titre, description, actions, aide }: { titre: string; description?: ReactNode; actions?: ReactNode; aide?: ReactNode }) {
  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="min-w-0 mr-auto">
          <h1 className="groovy text-3xl sm:text-4xl text-vin leading-tight">{titre}</h1>
          {description && <p className="mt-1.5 text-sourdine max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {aide && (
        <details className="mt-4 max-w-2xl rounded-xl bg-teinte/60 px-4 py-2.5 text-sm">
          <summary className="cursor-pointer font-semibold text-vin">Comment ça marche</summary>
          <div className="mt-2 grid gap-1.5 text-encre/90">{aide}</div>
        </details>
      )}
    </header>
  );
}

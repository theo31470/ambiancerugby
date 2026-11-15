import { ViewTransition } from "react";

/**
 * Chaque page arrive comme dans une app : l'ancienne s'efface vite, la nouvelle glisse légèrement en place
 * (API View Transitions ; les navigateurs qui ne la connaissent pas gardent l'entrée en douceur en CSS).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-entre" exit="page-sort" default="none">
      <div className="entree-page">{children}</div>
    </ViewTransition>
  );
}

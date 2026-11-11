/** Chaque page arrive en douceur au lieu d'apparaître d'un coup. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="entree-page">{children}</div>;
}

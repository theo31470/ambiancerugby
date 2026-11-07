import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-bordeaux text-white/80 mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-3 text-sm">
        <div>
          <p className="titre text-white text-xl font-bold">Ambiance Rugby</p>
          <p className="mt-2 max-w-xs">Le rugby comme en tribune : scores, classements, clubs et joueurs.</p>
        </div>
        <nav aria-label="Compétitions" className="grid gap-1.5">
          <p className="text-white font-semibold mb-1">Compétitions</p>
          <Link href="/competitions/top-14" className="hover:text-white">Top 14</Link>
          <Link href="/competitions/pro-d2" className="hover:text-white">Pro D2</Link>
          <Link href="/competitions/champions-cup" className="hover:text-white">Champions Cup</Link>
          <Link href="/competitions/six-nations" className="hover:text-white">Tournoi des Six Nations</Link>
        </nav>
        <div className="grid gap-1.5 content-start">
          <p className="text-white font-semibold mb-1">Le site</p>
          <Link href="/actus" className="hover:text-white">Actus</Link>
          <Link href="/inscription" className="hover:text-white">Créer un compte</Link>
          <p className="text-white/50 mt-3 text-xs">Données de match fournies par des services tiers ; certaines compétitions sont saisies par la rédaction.</p>
        </div>
      </div>
    </footer>
  );
}

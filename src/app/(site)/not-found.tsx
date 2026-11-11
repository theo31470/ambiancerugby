import Link from "next/link";
import { Ballon } from "@/components/deco/Icones";

export default function NotFound() {
  return (
    <div className="max-w-md py-10">
      <div className="relative h-24 overflow-hidden" aria-hidden>
        <div className="ballon-trajet"><div className="ballon-rebond"><Ballon className="w-14 text-vin" /></div></div>
      </div>
      <h1 className="groovy text-6xl text-vin">Ballon en touche</h1>
      <p className="mt-3 text-sourdine">Cette page n&apos;existe pas ou a été déplacée. Remise en jeu côté accueil.</p>
      <Link href="/" className="bouton mt-6">Revenir à l&apos;accueil</Link>
    </div>
  );
}

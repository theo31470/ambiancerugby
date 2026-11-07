import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md">
      <h1 className="text-4xl font-extrabold">Ballon en touche</h1>
      <p className="mt-3 text-sourdine">Cette page n&apos;existe pas ou a été déplacée.</p>
      <Link href="/" className="bouton mt-6">Revenir à l&apos;accueil</Link>
    </div>
  );
}

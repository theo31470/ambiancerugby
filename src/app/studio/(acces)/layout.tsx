/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Studio", template: "%s · Studio Ambiance Rugby" }, robots: { index: false, follow: false } };

/** Accès au studio : écran sobre, sans rien du site public. */
export default function AccesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-bordeaux px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/logo-blanc.png" alt="" className="h-12 w-auto" />
          <p className="groovy text-3xl text-moutarde">Studio</p>
        </div>
        <div className="bg-surface text-encre rounded-[1.5rem] p-6 sm:p-7 shadow-2xl">{children}</div>
        <p className="mt-5 text-center text-xs text-white/50">Espace réservé à l&apos;équipe d&apos;Ambiance Rugby. Toutes les connexions sont enregistrées.</p>
      </div>
    </div>
  );
}

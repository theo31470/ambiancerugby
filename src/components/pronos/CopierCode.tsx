"use client";
import { useState } from "react";

export default function CopierCode({ code }: { code: string }) {
  const [copie, setCopie] = useState(false);
  const partager = async () => {
    const texte = `Rejoins ma ligue de pronos sur Ambiance Rugby avec le code ${code} : ${location.origin}/pronos?vue=ligues`;
    try {
      if (navigator.share) await navigator.share({ title: "Ma ligue Ambiance Rugby", text: texte });
      else { await navigator.clipboard.writeText(texte); setCopie(true); setTimeout(() => setCopie(false), 2000); }
    } catch { /* partage annulé */ }
  };
  return (
    <button type="button" onClick={partager} className="inline-flex items-center gap-3 rounded-xl bg-bordeaux text-white px-4 py-2" data-onde>
      <span className="titre text-2xl font-extrabold tracking-[.2em] text-moutarde">{code}</span>
      <span className="text-sm font-semibold">{copie ? "Lien copié ✓" : "Inviter mes potes"}</span>
    </button>
  );
}

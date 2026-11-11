"use client";
import { useState } from "react";

export default function PartagerRecap({ texte }: { texte: string }) {
  const [fait, setFait] = useState(false);
  return (
    <button type="button" className="bouton-or" onClick={async () => {
      const t = `${texte} ${location.origin}`;
      try {
        if (navigator.share) await navigator.share({ title: "Mon carnet Ambiance Rugby", text: t });
        else { await navigator.clipboard.writeText(t); setFait(true); setTimeout(() => setFait(false), 2000); }
      } catch { /* annulé */ }
    }}>{fait ? "Copié ✓" : "Partager mon récap"}</button>
  );
}

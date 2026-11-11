"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/client";

/** Activation (QR code) ou vérification du code TOTP à 6 chiffres : la session passe au niveau de sécurité 2. */
export default function DoubleAuth({ facteur, suite }: { facteur: string | null; suite: string }) {
  const [id, setId] = useState<string | null>(facteur);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (facteur) return;
    const db = browserClient();
    (async () => {
      // un essai d'activation inachevé est remplacé
      const { data: l } = await db.auth.mfa.listFactors();
      for (const f of l?.all ?? []) if (f.status === "unverified") await db.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await db.auth.mfa.enroll({ factorType: "totp", friendlyName: `Studio ${new Date().toLocaleDateString("fr-FR")}` });
      if (error || !data) { setErreur(error?.message ?? "Activation impossible."); return; }
      setId(data.id); setQr(data.totp.qr_code); setSecret(data.totp.secret);
    })();
  }, [facteur]);

  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setEnvoi(true); setErreur(null);
    const { error } = await browserClient().auth.mfa.challengeAndVerify({ factorId: id, code: code.replace(/\s/g, "") });
    if (error) { setErreur("Code incorrect ou expiré. Réessayez avec le code affiché maintenant."); setEnvoi(false); setCode(""); return; }
    window.location.assign(suite);
  };

  return (
    <form onSubmit={valider} className="mt-5 grid gap-4">
      {!facteur && (
        qr ? (
          <div className="grid justify-items-center gap-2">
            <img src={qr} alt="QR code à scanner avec votre application d'authentification" className="w-48 h-48 rounded-xl bg-white p-2 border border-trait" />
            {secret && <p className="text-xs text-sourdine text-center">Pas d&apos;appareil photo ? Clé à saisir : <code className="font-mono break-all text-encre">{secret}</code></p>}
          </div>
        ) : !erreur && <p className="text-sm text-sourdine text-center animate-pulse">Préparation du QR code…</p>
      )}
      <label className="grid gap-1 text-sm font-semibold">Code à 6 chiffres
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, "").slice(0, 7))} inputMode="numeric" autoComplete="one-time-code" autoFocus
          placeholder="123 456" required className="champ text-center tnum text-2xl tracking-[0.3em]" />
      </label>
      {erreur && <p role="alert" className="text-sm text-alerte">{erreur}</p>}
      <button className="bouton justify-center" disabled={envoi || code.replace(/\s/g, "").length !== 6 || !id}>{envoi ? "Vérification…" : facteur ? "Entrer au studio" : "Activer et entrer"}</button>
    </form>
  );
}

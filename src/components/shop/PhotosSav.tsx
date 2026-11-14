"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

/** Réduit une photo (1600 px, JPEG) avant l'envoi : quatre photos de téléphone tiennent ainsi dans une seule demande. */
async function reduire(f: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.82));
    return blob ? new File([blob], f.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : f;
  } catch {
    return f; // format que le navigateur ne sait pas lire (HEIC hors Safari) : envoyé tel quel
  }
}

export default function PhotosSav() {
  const [apercus, setApercus] = useState<string[]>([]);
  const [prep, setPrep] = useState(false);
  return (
    <div>
      <input id="photos" name="photos" type="file" accept="image/*" multiple
        onChange={async (e) => {
          const input = e.currentTarget;
          const choisis = [...(input.files ?? [])].slice(0, 4);
          setPrep(true);
          const reduits = await Promise.all(choisis.map(reduire));
          const dt = new DataTransfer();
          reduits.forEach((f) => dt.items.add(f));
          input.files = dt.files;
          setApercus(reduits.map((f) => URL.createObjectURL(f)));
          setPrep(false);
        }}
        className="mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-teinte file:px-4 file:py-2 file:font-semibold file:text-encre hover:file:bg-trait" />
      {prep && <p className="mt-2 text-sm text-sourdine" aria-live="polite">Préparation des photos…</p>}
      {apercus.length > 0 && (
        <ul className="mt-3 flex gap-2">
          {apercus.map((u) => <li key={u}><img src={u} alt="" className="w-20 h-20 rounded-xl object-cover border border-trait" /></li>)}
        </ul>
      )}
    </div>
  );
}

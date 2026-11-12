/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { BRICOLAGE_700, BRICOLAGE_800, INSTRUMENT_400, INSTRUMENT_600, SHRIKHAND_400 } from "@/lib/factures/assets";

/** Charte des visuels réseaux sociaux (format portrait Instagram 4:5). */
export const FORMAT = { width: 1080, height: 1350 };
export const SLIDES_APRES_MATCH = ["Le score", "Les notes", "En chiffres", "La courbe", "L'histoire"] as const;
export const C = { vin: "#934f5e", bordeaux: "#3e1621", moutarde: "#f2b53a", encre: "#2a1419", fond: "#fcf7f8", teinte: "#f6e9ec", sourdine: "#7a6166", blanc: "#ffffff" };

export function polices() {
  const f = (name: string, b64: string, weight: 400 | 600 | 700 | 800) => ({ name, data: Buffer.from(b64, "base64"), weight, style: "normal" as const });
  return [f("Shrikhand", SHRIKHAND_400, 400), f("Bricolage", BRICOLAGE_700, 700), f("Bricolage", BRICOLAGE_800, 800), f("Instrument", INSTRUMENT_400, 400), f("Instrument", INSTRUMENT_600, 600)];
}

/** Cadre commun : fond, poteaux en filigrane, pied de page avec la pagination. */
export function Cadre({ clair = false, page, total, rubrique, children }: { clair?: boolean; page: number; total: number; rubrique: string; children: ReactNode }) {
  const texte = clair ? C.encre : C.blanc;
  const discret = clair ? "rgba(42,20,25,.55)" : "rgba(255,255,255,.62)";
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: clair ? C.fond : C.bordeaux, color: texte, fontFamily: "Instrument", position: "relative", padding: "64px 72px 56px" }}>
      {/* poteaux en filigrane */}
      <div style={{ position: "absolute", left: 160, top: 0, bottom: 0, width: 6, background: clair ? "rgba(147,79,94,.07)" : "rgba(255,255,255,.05)" }} />
      <div style={{ position: "absolute", right: 160, top: 0, bottom: 0, width: 6, background: clair ? "rgba(147,79,94,.07)" : "rgba(255,255,255,.05)" }} />
      <div style={{ position: "absolute", left: 160, right: 160, top: 470, height: 6, background: clair ? "rgba(147,79,94,.07)" : "rgba(255,255,255,.05)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "Bricolage", fontWeight: 700, fontSize: 28, color: discret }}>
        <span>{rubrique}</span>
        <span style={{ display: "flex", gap: 10 }}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} style={{ width: i + 1 === page ? 34 : 12, height: 12, borderRadius: 12, background: i + 1 === page ? C.moutarde : clair ? "rgba(42,20,25,.18)" : "rgba(255,255,255,.25)" }} />
          ))}
        </span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span style={{ fontFamily: "Shrikhand", fontSize: 46, color: clair ? C.vin : C.blanc }}>Ambiance Rugby</span>
        <span style={{ fontFamily: "Bricolage", fontWeight: 700, fontSize: 26, color: discret }}>ambiance-rugby.fr</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, background: C.moutarde }} />
    </div>
  );
}

export function Blason({ logo, nom, taille = 190, couleur }: { logo: string | null; nom: string; taille?: number; couleur?: string | null }) {
  return logo
    ? <div style={{ width: taille, height: taille, borderRadius: taille * 0.2, background: C.blanc, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 0 -4px rgba(0,0,0,.25)" }}><img src={logo} width={taille * 0.78} height={taille * 0.78} style={{ objectFit: "contain" }} alt="" /></div>
    : <div style={{ width: taille, height: taille, borderRadius: taille, background: couleur ?? C.vin, display: "flex", alignItems: "center", justifyContent: "center", color: C.blanc, fontFamily: "Bricolage", fontWeight: 800, fontSize: taille * 0.34 }}>{nom.slice(0, 3).toUpperCase()}</div>;
}

export function Titre({ children, clair = false, taille = 96 }: { children: ReactNode; clair?: boolean; taille?: number }) {
  return <div style={{ display: "flex", fontFamily: "Shrikhand", fontSize: taille, lineHeight: 1.05, color: clair ? C.vin : C.moutarde, marginTop: 44 }}>{children}</div>;
}

export const dateFr = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", ...opts });
export const signe = (n: number) => (n > 0 ? `+${n}` : String(n));

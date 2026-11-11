import { ImageResponse } from "next/og";
import { getMatch } from "@/lib/queries";
import { BRICOLAGE_800, SHRIKHAND_400 } from "@/lib/factures/assets";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Affiche du match sur Ambiance Rugby";

/** Image de partage d'un match (réseaux sociaux, Google Discover) : affiche, score ou horaire. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const m = await getMatch((await params).id);
  const polices = [
    { name: "Shrikhand", data: Buffer.from(SHRIKHAND_400, "base64"), weight: 400 as const, style: "normal" as const },
    { name: "Bricolage", data: Buffer.from(BRICOLAGE_800, "base64"), weight: 800 as const, style: "normal" as const },
  ];
  const nom = (t?: { short_name: string | null; name: string }) => (t ? t.short_name ?? t.name : "");
  const fini = m?.status === "finished" && m.home_score != null;
  const live = m && ["live", "halftime"].includes(m.status);
  const quand = m ? new Date(m.kickoff_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "";
  const blason = (t?: { logo_url: string | null; color: string | null; short_name: string | null; name: string }) => t?.logo_url
    // eslint-disable-next-line @next/next/no-img-element
    ? <div style={{ width: 170, height: 170, borderRadius: 32, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><img src={t.logo_url} width={140} height={140} style={{ objectFit: "contain" }} alt="" /></div>
    : <div style={{ width: 170, height: 170, borderRadius: 999, background: t?.color ?? "#934f5e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Bricolage", fontSize: 64 }}>{nom(t).slice(0, 3).toUpperCase()}</div>;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#3e1621", color: "#fff", padding: "48px 64px", position: "relative" }}>
        {[0.13, 0.5, 0.87].map((x) => <div key={x} style={{ position: "absolute", left: `${x * 100}%`, top: 0, bottom: 0, width: 3, background: "rgba(255,255,255,.06)" }} />)}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "Bricolage", fontSize: 30, color: "rgba(255,255,255,.7)" }}>
          <span>{m?.competition.name ?? "Ambiance Rugby"}</span>
          <span style={{ display: "flex", background: live ? "#b3261e" : "#f2b53a", color: live ? "#fff" : "#3e1621", borderRadius: 999, padding: "6px 22px" }}>{live ? "EN DIRECT" : fini ? "Score final" : "Avant-match"}</span>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 330, gap: 18 }}>{blason(m?.home)}<span style={{ fontFamily: "Bricolage", fontSize: 40, textAlign: "center" }}>{nom(m?.home)}</span></div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {fini || live
              ? <span style={{ fontFamily: "Shrikhand", fontSize: 150, color: "#f2b53a", lineHeight: 1 }}>{m?.home_score ?? 0}–{m?.away_score ?? 0}</span>
              : <span style={{ fontFamily: "Shrikhand", fontSize: 110, color: "#f2b53a", lineHeight: 1 }}>VS</span>}
            {!fini && <span style={{ fontFamily: "Bricolage", fontSize: 30, marginTop: 18, color: "rgba(255,255,255,.8)" }}>{quand}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 330, gap: 18 }}>{blason(m?.away)}<span style={{ fontFamily: "Bricolage", fontSize: 40, textAlign: "center" }}>{nom(m?.away)}</span></div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <span style={{ fontFamily: "Shrikhand", fontSize: 44 }}>Ambiance Rugby</span>
          <span style={{ fontFamily: "Bricolage", fontSize: 26, color: "rgba(255,255,255,.6)" }}>ambiance-rugby.fr</span>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, background: "#f2b53a" }} />
      </div>
    ),
    { ...size, fonts: polices },
  );
}

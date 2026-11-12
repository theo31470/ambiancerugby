/* eslint-disable @next/next/no-img-element */
import { courbe, type ApresMatch, type Cote } from "@/lib/contenu/apres-match";
import { Blason, C, Cadre, SLIDES_APRES_MATCH, Titre, dateFr, signe } from "@/lib/contenu/visuel";

/** Les cinq images du carrousel d'après-match. */
const TOTAL = SLIDES_APRES_MATCH.length;
const nomCote = (d: ApresMatch, c: Cote) => (c === "home" ? d.dom.court : d.ext.court);
const rubrique = (d: ApresMatch) => `${d.competition} · ${dateFr(d.date, { day: "numeric", month: "long" })}`;

function Score({ d, page }: { d: ApresMatch; page: number }) {
  const mt = d.chiffres.home.mt1 != null ? `Mi-temps ${d.chiffres.home.mt1}-${d.chiffres.away.mt1}` : null;
  const liste = (c: Cote) => d.marqueurs.filter((x) => x.cote === c);
  const colonne = (c: Cote) => (
    <div style={{ display: "flex", flexDirection: "column", width: 400, alignItems: c === "home" ? "flex-start" : "flex-end", gap: 8 }}>
      {liste(c).slice(0, 8).map((x, i) => (
        <span key={i} style={{ display: "flex", gap: 10, fontSize: 30, fontWeight: 600 }}>
          {c === "away" && x.minute != null && <span style={{ color: "rgba(255,255,255,.55)" }}>{x.minute}&apos;</span>}
          <span>{x.nom}</span>
          {c === "home" && x.minute != null && <span style={{ color: "rgba(255,255,255,.55)" }}>{x.minute}&apos;</span>}
        </span>
      ))}
      {liste(c).length > 8 && <span style={{ fontSize: 26, color: "rgba(255,255,255,.55)" }}>et {liste(c).length - 8} autres</span>}
    </div>
  );
  return (
    <Cadre page={page} total={TOTAL} rubrique={rubrique(d)}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ display: "flex", alignSelf: "center", background: C.moutarde, color: C.bordeaux, borderRadius: 999, padding: "10px 30px", fontFamily: "Bricolage", fontWeight: 800, fontSize: 30 }}>Score final</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 56 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 250, gap: 22 }}>
          <Blason logo={d.dom.logo} nom={d.dom.court} couleur={d.dom.couleur} taille={168} />
          <span style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: 44, textAlign: "center" }}>{d.dom.court}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
          <span style={{ fontFamily: "Shrikhand", fontSize: 128, color: C.moutarde, lineHeight: 1 }}>{d.scoreDom}-{d.scoreExt}</span>
          {mt && <span style={{ fontSize: 30, marginTop: 14, color: "rgba(255,255,255,.7)" }}>{mt}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 250, gap: 22 }}>
          <Blason logo={d.ext.logo} nom={d.ext.court} couleur={d.ext.couleur} taille={168} />
          <span style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: 44, textAlign: "center" }}>{d.ext.court}</span>
        </div>
      </div>
      {d.marqueurs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", marginTop: 70 }}>
          <span style={{ display: "flex", alignSelf: "center", fontFamily: "Bricolage", fontWeight: 700, fontSize: 28, color: "rgba(255,255,255,.6)", marginBottom: 20 }}>Les essais</span>
          <div style={{ display: "flex", justifyContent: "space-between" }}>{colonne("home")}{colonne("away")}</div>
        </div>
      )}
      </div>
    </Cadre>
  );
}

function Notes({ d, page }: { d: ApresMatch; page: number }) {
  const top = d.notes.slice(0, 5);
  const ligne = (j: ApresMatch["notes"][number]) => [j.essais ? `${j.essais} essai${j.essais > 1 ? "s" : ""}` : null, j.points - 5 * j.essais > 0 ? `${j.points - 5 * j.essais} pts au pied` : null, j.plaquages ? `${j.plaquages} plaquages` : null, j.franchissements ? `${j.franchissements} franchissement${j.franchissements > 1 ? "s" : ""}` : null].filter(Boolean).slice(0, 3).join(" · ");
  return (
    <Cadre clair page={page} total={TOTAL} rubrique={`${d.dom.court} – ${d.ext.court}`}>
      <Titre clair>Les notes</Titre>
      <span style={{ fontSize: 30, color: C.sourdine, marginTop: 8 }}>Le top 5 du match, noté par l&apos;algorithme Ambiance Rugby</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 40 }}>
        {top.map((j, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, background: j.motm ? C.bordeaux : C.blanc, color: j.motm ? C.blanc : C.encre, borderRadius: 28, padding: "18px 22px", border: j.motm ? "none" : `3px solid ${C.teinte}` }}>
            {j.photo
              ? <img src={j.photo} width={104} height={104} style={{ borderRadius: 104, objectFit: "cover", objectPosition: "top", background: C.teinte }} alt="" />
              : <div style={{ width: 104, height: 104, borderRadius: 104, background: j.motm ? "rgba(255,255,255,.15)" : C.teinte, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bricolage", fontWeight: 800, fontSize: 40, color: C.vin }}>{j.nom.slice(0, 1)}</div>}
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "Bricolage", fontWeight: 800, fontSize: 40 }}>
                {j.prenom.slice(0, 1)}. {j.nom}
                {j.motm && <span style={{ display: "flex", fontSize: 22, background: C.moutarde, color: C.bordeaux, borderRadius: 999, padding: "4px 14px" }}>Homme du match</span>}
              </span>
              <span style={{ fontSize: 27, opacity: 0.75, marginTop: 4 }}>{nomCote(d, j.cote)}{ligne(j) ? ` · ${ligne(j)}` : ""}</span>
            </div>
            <span style={{ fontFamily: "Shrikhand", fontSize: 70, color: j.motm ? C.moutarde : C.vin }}>{j.note.toFixed(1).replace(".", ",")}</span>
          </div>
        ))}
      </div>
    </Cadre>
  );
}

function Chiffres({ d, page }: { d: ApresMatch; page: number }) {
  const h = d.chiffres.home, a = d.chiffres.away;
  const dom = courbe(d.evenements);
  const lignes: [string, number, number][] = [
    ["Essais", h.essais, a.essais],
    ["Points au pied", 2 * h.transformations + 3 * (h.penalites + h.drops), 2 * a.transformations + 3 * (a.penalites + a.drops)],
    ...(h.mt1 != null ? [["Points en 1re période", h.mt1, a.mt1 ?? 0], ["Points en 2e période", h.mt2 ?? 0, a.mt2 ?? 0]] as [string, number, number][] : []),
    ...(d.detail ? [["Plaquages réussis", h.plaquages, a.plaquages], ["Franchissements", h.franchissements, a.franchissements], ["Passes après contact", h.offloads, a.offloads], ["Ballons grattés", h.grattages, a.grattages]] as [string, number, number][] : []),
    ["Transformations réussies", h.transformations, a.transformations],
    ["Pénalités réussies", h.penalites, a.penalites],
    ["Cartons", h.jaunes + h.rouges, a.jaunes + a.rouges],
    ["Temps de domination (%)", dom.pctDom, 100 - dom.pctDom],
  ];
  return (
    <Cadre page={page} total={TOTAL} rubrique={`${d.dom.court} – ${d.ext.court}`}>
      <Titre>Le match en chiffres</Titre>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, fontFamily: "Bricolage", fontWeight: 800, fontSize: 36 }}>
        <span style={{ color: C.blanc }}>{d.dom.court}</span><span style={{ color: C.moutarde }}>{d.ext.court}</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", marginTop: 10, marginBottom: 30 }}>
        {lignes.slice(0, 9).map(([label, x, y]) => {
          const max = Math.max(x, y, 1);
          return (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: "Shrikhand", fontSize: 54, color: x >= y ? C.blanc : "rgba(255,255,255,.5)" }}>{x}</span>
                <span style={{ fontSize: 30, fontWeight: 600, color: "rgba(255,255,255,.75)" }}>{label}</span>
                <span style={{ fontFamily: "Shrikhand", fontSize: 54, color: y >= x ? C.moutarde : "rgba(242,181,58,.5)" }}>{y}</span>
              </span>
              <div style={{ display: "flex", gap: 10, height: 18 }}>
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", background: "rgba(255,255,255,.08)", borderRadius: 18 }}><div style={{ width: `${(x / max) * 100}%`, background: C.vin, borderRadius: 18 }} /></div>
                <div style={{ flex: 1, display: "flex", background: "rgba(255,255,255,.08)", borderRadius: 18 }}><div style={{ width: `${(y / max) * 100}%`, background: C.moutarde, borderRadius: 18 }} /></div>
              </div>
            </div>
          );
        })}
      </div>
    </Cadre>
  );
}

function Courbe({ d, page }: { d: ApresMatch; page: number }) {
  const { valeurs, pctDom } = courbe(d.evenements);
  const W = 936, H = 520, MID = H / 2;
  const max = Math.max(6, ...valeurs.map(Math.abs));
  const fin = (valeurs.length - 1) * 0.5;
  const x = (t: number) => (t / Math.max(80, fin)) * W;
  const y = (v: number) => MID - (v / max) * (MID - 16);
  const pts = valeurs.map((v, i) => `${x(i * 0.5).toFixed(1)},${y(v).toFixed(1)}`).join(" L");
  const chemin = `M0,${MID} L${pts} L${x(fin)},${MID} Z`;
  const vide = valeurs.every((v) => Math.abs(v) < 0.01);
  return (
    <Cadre clair page={page} total={TOTAL} rubrique={`${d.dom.court} – ${d.ext.court}`}>
      <Titre clair>Qui a poussé ?</Titre>
      <span style={{ fontSize: 30, color: C.sourdine, marginTop: 8 }}>La courbe d&apos;ascendant, minute par minute</span>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 40 }}>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "Shrikhand", fontSize: 110, color: C.vin, lineHeight: 1 }}>{pctDom} %</span>
          <span style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: 32 }}>du temps de domination {d.dom.court}</span>
        </span>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontFamily: "Shrikhand", fontSize: 110, color: "#c48a12", lineHeight: 1 }}>{100 - pctDom} %</span>
          <span style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: 32 }}>{d.ext.court}</span>
        </span>
      </div>
      <div style={{ display: "flex", position: "relative", marginTop: 40, background: C.blanc, borderRadius: 28, padding: 0, border: `3px solid ${C.teinte}`, overflow: "hidden" }}>
        {vide
          ? <span style={{ padding: 60, fontSize: 30, color: C.sourdine }}>Fil du match indisponible pour ce match.</span>
          : (
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <defs>
                <clipPath id="h"><rect x="0" y="0" width={W} height={MID} /></clipPath>
                <clipPath id="b"><rect x="0" y={MID} width={W} height={MID} /></clipPath>
              </defs>
              <line x1={x(40)} x2={x(40)} y1={10} y2={H - 10} stroke={C.teinte} strokeWidth={4} />
              <line x1={0} x2={W} y1={MID} y2={MID} stroke={C.sourdine} strokeOpacity={0.35} strokeWidth={2} />
              <path d={chemin} fill={C.vin} clipPath="url(#h)" />
              <path d={chemin} fill={C.moutarde} clipPath="url(#b)" />
            </svg>
          )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 26, color: C.sourdine }}>
        <span>Coup d&apos;envoi</span><span>Mi-temps</span><span>80e</span>
      </div>
    </Cadre>
  );
}

function Histoire({ d, page }: { d: ApresMatch; page: number }) {
  const h = d.histoire;
  const total = h.matchs + 1;
  const vDom = h.vDom + (d.scoreDom > d.scoreExt ? 1 : 0), vExt = h.vExt + (d.scoreExt > d.scoreDom ? 1 : 0), nuls = h.nuls + (d.scoreDom === d.scoreExt ? 1 : 0);
  const serie = h.serie.cote && h.serie.n >= 2 ? `${h.serie.n}e victoire de suite pour ${nomCote(d, h.serie.cote)} dans ce duel` : null;
  const carte = (gros: string, texte: string, couleur: string = C.moutarde) => (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "rgba(255,255,255,.07)", borderRadius: 28, padding: "26px 30px" }}>
      <span style={{ fontFamily: "Shrikhand", fontSize: 76, color: couleur, lineHeight: 1.05 }}>{gros}</span>
      <span style={{ fontSize: 28, marginTop: 8, color: "rgba(255,255,255,.8)" }}>{texte}</span>
    </div>
  );
  const ind = (c: Cote) => d.indice[c];
  return (
    <Cadre page={page} total={TOTAL} rubrique={`${d.dom.court} – ${d.ext.court}`}>
      <Titre>L&apos;histoire</Titre>
      <span style={{ fontSize: 30, color: "rgba(255,255,255,.7)", marginTop: 8 }}>
        {total} confrontation{total > 1 ? "s" : ""} dans la base Ambiance Rugby{h.premiere ? ` depuis ${dateFr(h.premiere, { year: "numeric" })}` : ""}
      </span>
      <div style={{ display: "flex", height: 70, borderRadius: 20, overflow: "hidden", marginTop: 36 }}>
        {vDom > 0 && <div style={{ flex: vDom, background: C.vin, display: "flex", alignItems: "center", paddingLeft: 22, fontFamily: "Bricolage", fontWeight: 800, fontSize: 32 }}>{vDom} {d.dom.court}</div>}
        {nuls > 0 && <div style={{ flex: nuls, background: "rgba(255,255,255,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Bricolage", fontWeight: 800, fontSize: 28 }}>{nuls}</div>}
        {vExt > 0 && <div style={{ flex: vExt, background: C.moutarde, color: C.bordeaux, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 22, fontFamily: "Bricolage", fontWeight: 800, fontSize: 32 }}>{vExt} {d.ext.court}</div>}
      </div>
      <div style={{ display: "flex", gap: 22, marginTop: 34 }}>
        {serie ? carte(String(h.serie.n), serie) : carte(`${Math.abs(d.scoreDom - d.scoreExt)} pts`, "d'écart ce soir")}
        {h.precedent ? carte(h.precedent.score, `la dernière fois, le ${dateFr(h.precedent.date)}`, C.blanc) : carte("1re", "confrontation dans notre base", C.blanc)}
      </div>
      {h.plusLarge && (
        <div style={{ display: "flex", gap: 22, marginTop: 22 }}>
          {carte(`+${h.plusLarge.ecart}`, `plus large victoire ${d.dom.court} avant ce soir (${h.plusLarge.score}, ${dateFr(h.plusLarge.date, { year: "numeric" })})`)}
        </div>
      )}
      {(ind("home") || ind("away")) && (
        <div style={{ display: "flex", flexDirection: "column", marginTop: 34, background: C.blanc, color: C.encre, borderRadius: 28, padding: "26px 30px" }}>
          <span style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: 32, color: C.vin }}>L&apos;Indice Ambiance après le match</span>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            {(["home", "away"] as const).map((c) => {
              const v = ind(c);
              if (!v) return <span key={c} />;
              return (
                <span key={c} style={{ display: "flex", flexDirection: "column", alignItems: c === "home" ? "flex-start" : "flex-end" }}>
                  <span style={{ fontSize: 30, fontWeight: 600 }}>{nomCote(d, c)}{v.rang ? ` · ${v.rang}e` : ""}</span>
                  <span style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                    <span style={{ fontFamily: "Shrikhand", fontSize: 64 }}>{Math.round(v.apres)}</span>
                    <span style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: 36, color: v.delta >= 0 ? "#2e7d4f" : "#b3261e" }}>{signe(Math.round(v.delta))}</span>
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </Cadre>
  );
}

export const VUES_APRES_MATCH = [Score, Notes, Chiffres, Courbe, Histoire];

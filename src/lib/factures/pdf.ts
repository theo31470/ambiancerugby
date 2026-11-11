import { PDFDocument, degrees, rgb, type PDFFont, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { BRICOLAGE_700, BRICOLAGE_800, INSTRUMENT_400, INSTRUMENT_600, LOGO_BLANC_PNG, LOGO_RATIO, SHRIKHAND_400 } from "./assets";
import { PAYS, dateLongue, montant, type DocumentFacture, type Vendeur } from "./types";

/**
 * Facture ou avoir en PDF (A4), à l'identité Ambiance Rugby : bandeau bordeaux aux lignes de terrain,
 * liseré moutarde, titre groovy, mise en page sobre. Généré depuis la copie figée en base :
 * identique à chaque téléchargement.
 *
 * Mentions obligatoires (micro-entreprise) : identité et SIRET du vendeur, numéro unique, date d'émission,
 * date de la prestation, identité de l'acheteur, désignation, quantité, prix, « TVA non applicable, art. 293 B du CGI »,
 * pénalités de retard et indemnité forfaitaire de 40 €.
 */

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const C = {
  bordeaux: hex("#3e1621"), vin: hex("#934f5e"), moutarde: hex("#f2b53a"), encre: hex("#2a1419"),
  sourdine: hex("#7a6166"), trait: hex("#ecd9dd"), teinte: hex("#f8f1f3"), blanc: rgb(1, 1, 1),
};
const W = 595.28;
const H = 841.89;
const M = 46;

type Polices = { texte: PDFFont; texteFort: PDFFont; titre: PDFFont; titreNoir: PDFFont; groovy: PDFFont };
type Opt = { font?: PDFFont; size?: number; color?: RGB; align?: "left" | "right" | "center"; opacity?: number };

/** Remplace les caractères absents de la police (espaces fines, flèches…). */
function nettoyeur(font: PDFFont) {
  const ok = new Set(font.getCharacterSet());
  const rempl: Record<string, string> = { " ": " ", " ": " ", "−": "-", "‑": "-", "→": "->", "’": "'", "•": "*" };
  return (t: string) => Array.from(t.normalize("NFC")).map((ch) => (ok.has(ch.codePointAt(0)!) ? ch : rempl[ch] ?? "?")).join("");
}

function couper(t: string, font: PDFFont, size: number, max: number) {
  const lignes: string[] = [];
  let cur = "";
  for (const w of t.split(/[ \t\n]+/).filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w;
    if (!cur || font.widthOfTextAtSize(next, size) <= max) cur = next;
    else { lignes.push(cur); cur = w; }
  }
  if (cur) lignes.push(cur);
  return lignes;
}

export async function rendrePdf(doc: DocumentFacture, vendeur: Vendeur) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const avoir = doc.type === "avoir";
  const titre = avoir ? "Avoir" : "Facture";
  pdf.setTitle(`${titre} ${doc.numero} - Ambiance Rugby`);
  pdf.setAuthor("Ambiance Rugby");
  pdf.setCreator("Ambiance Rugby");
  pdf.setProducer("Ambiance Rugby");
  pdf.setLanguage("fr-FR");
  pdf.setCreationDate(new Date(doc.emis_le));

  const charger = (b64: string) => pdf.embedFont(Buffer.from(b64, "base64"), { subset: true });
  const f: Polices = { texte: await charger(INSTRUMENT_400), texteFort: await charger(INSTRUMENT_600), titre: await charger(BRICOLAGE_700), titreNoir: await charger(BRICOLAGE_800), groovy: await charger(SHRIKHAND_400) };
  const propre = nettoyeur(f.texte);
  const page = pdf.addPage([W, H]);

  const ecrire = (s: string, x: number, y: number, o: Opt = {}) => {
    const font = o.font ?? f.texte;
    const size = o.size ?? 9.5;
    const str = propre(s);
    const w = font.widthOfTextAtSize(str, size);
    page.drawText(str, { x: x - (o.align === "right" ? w : o.align === "center" ? w / 2 : 0), y, size, font, color: o.color ?? C.encre, opacity: o.opacity });
    return w;
  };
  const etiquette = (s: string, x: number, y: number, o: Opt = {}) => ecrire(s, x, y, { font: f.titre, size: 8, color: C.sourdine, ...o });

  // ── Bandeau bordeaux, lignes de terrain ────────────────────────────────
  const bandeau = 124;
  page.drawRectangle({ x: 0, y: H - bandeau, width: W, height: bandeau, color: C.bordeaux });
  for (const x of [W * 0.13, W * 0.5, W * 0.87]) page.drawLine({ start: { x, y: H }, end: { x, y: H - bandeau }, thickness: 1.2, color: C.blanc, opacity: 0.07 });
  page.drawLine({ start: { x: W * 0.69, y: H }, end: { x: W * 0.69, y: H - bandeau }, thickness: 1, color: C.blanc, opacity: 0.05, dashArray: [5, 6] });
  page.drawRectangle({ x: 0, y: H - bandeau - 4, width: W, height: 4, color: C.moutarde });
  const logo = await pdf.embedPng(Buffer.from(LOGO_BLANC_PNG, "base64"));
  const lh = 66;
  page.drawImage(logo, { x: M, y: H - bandeau / 2 - lh / 2, width: lh * LOGO_RATIO, height: lh });
  ecrire(titre, W - M, H - 70, { font: f.groovy, size: 34, color: C.blanc, align: "right" });
  ecrire(`N° ${doc.numero}`, W - M, H - 92, { font: f.titre, size: 12, color: C.moutarde, align: "right" });

  if (doc.mode_test) {
    page.drawText(propre("DOCUMENT DE TEST - SANS VALEUR"), { x: 120, y: 260, size: 34, font: f.titreNoir, color: C.vin, opacity: 0.12, rotate: degrees(32) });
  }

  // ── Parties à gauche, dates à droite ──────────────────────────────────
  let y = H - bandeau - 4 - 36;
  const c = doc.client;
  const villeLigne = [c.cp, c.ville].filter(Boolean).join(" ");
  const acheteur = [c.ligne1, c.ligne2, villeLigne, c.pays && c.pays !== "FR" ? PAYS[c.pays] ?? c.pays : null, c.nom ? c.email : null].filter((x): x is string => !!x);
  const emetteur = [`${vendeur.nom}, entrepreneur individuel`, ...vendeur.adresse.split(/,\s*/), `SIRET ${vendeur.siret}`, vendeur.email];
  const colW = 168;
  const partie = (t: string, nom: string, rows: string[], x: number) => {
    etiquette(t, x, y);
    const noms = couper(propre(nom), f.titre, 12, colW);
    noms.forEach((n, i) => ecrire(n, x, y - 18 - i * 14, { font: f.titre, size: 12 }));
    rows.forEach((r, i) => ecrire(r, x, y - 33 - (noms.length - 1) * 14 - i * 12.5, { size: 9.5, color: C.sourdine }));
    return 33 + (noms.length - 1) * 14 + rows.length * 12.5;
  };
  const hE = partie("Émetteur", "Ambiance Rugby", emetteur.slice(0, 1).concat(emetteur.slice(1)), M);
  const hA = partie(avoir ? "Au profit de" : "Facturé à", c.nom || c.email, acheteur, M + colW + 22);

  const infos: [string, string][] = avoir
    ? [["Date d'émission", dateLongue(doc.emis_le)], ["Remboursé le", dateLongue(doc.regle_le ?? doc.emis_le)], ["Facture d'origine", doc.facture_origine ?? "-"]]
    : [["Date d'émission", dateLongue(doc.emis_le)], ["Payée le", dateLongue(doc.regle_le ?? doc.emis_le)], ...(doc.periode ? ([["Période", doc.periode]] as [string, string][]) : [])];
  infos.forEach(([k, v], i) => {
    etiquette(k, W - M, y - i * 31, { align: "right" });
    ecrire(v, W - M, y - 15 - i * 31, { font: f.texteFort, size: 10, align: "right" });
  });
  y -= Math.max(hE, hA, infos.length * 31 - 6) + 34;

  if (avoir && doc.motif) {
    const lignesMotif = couper(propre(`Motif : ${doc.motif}`), f.texte, 9.5, W - 2 * M - 28);
    const h = 16 + lignesMotif.length * 12.5;
    const bas = y + 11 - h;
    page.drawRectangle({ x: M, y: bas, width: W - 2 * M, height: h, color: C.teinte });
    page.drawRectangle({ x: M, y: bas, width: 3.5, height: h, color: C.moutarde });
    lignesMotif.forEach((l, i) => ecrire(l, M + 16, y - 3.5 - i * 12.5, { size: 9.5 }));
    y -= h + 16;
  }

  // ── Lignes ─────────────────────────────────────────────────────────────
  const col = { qte: W - M - 176, unite: W - M - 88, total: W - M };
  etiquette("Désignation", M, y);
  etiquette("Qté", col.qte, y, { align: "right" });
  etiquette("Prix unitaire", col.unite, y, { align: "right" });
  etiquette("Montant", col.total, y, { align: "right" });
  y -= 9;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.4, color: C.bordeaux });
  y -= 19;
  const largeurLabel = col.qte - M - 46;
  for (const l of doc.lignes) {
    const haut = y;
    const ls = couper(propre(l.label), f.titre, 10.5, largeurLabel);
    ls.forEach((s, i) => ecrire(s, M, y - i * 13, { font: f.titre, size: 10.5 }));
    y -= ls.length * 13;
    if (l.detail) for (const d of couper(propre(l.detail), f.texte, 9, largeurLabel)) { ecrire(d, M, y + 1, { size: 9, color: C.sourdine }); y -= 11.5; }
    ecrire(String(l.quantite), col.qte, haut, { font: f.texteFort, size: 10, align: "right" });
    ecrire(montant(l.unite_cents), col.unite, haut, { font: f.texteFort, size: 10, align: "right" });
    ecrire(montant(l.total_cents), col.total, haut, { font: f.titre, size: 10.5, align: "right" });
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: C.trait });
    y -= 20;
  }

  // ── Totaux (à droite) ─────────────────────────────────────────────────
  const tx = W - M - 206;
  const hautTotaux = y;
  const ligneTotal = (k: string, v: string) => { ecrire(k, tx, y, { size: 9.5, color: C.sourdine }); ecrire(v, W - M, y, { font: f.texteFort, size: 9.5, align: "right" }); y -= 17; };
  ligneTotal("Total HT", montant(doc.total_cents));
  ligneTotal("TVA", "Non applicable");
  y += 4;
  // encart du total, posé sur un fond moutarde décalé (comme les cartes du site)
  const bx = tx - 12, bw = W - M - bx, bh = 44, by = y - bh + 2;
  page.drawRectangle({ x: bx + 4, y: by - 4, width: bw, height: bh, color: C.moutarde });
  page.drawRectangle({ x: bx, y: by, width: bw, height: bh, color: C.bordeaux });
  ecrire(avoir ? "Montant remboursé" : "Total payé", bx + 12, by + 17, { font: f.titre, size: 10.5, color: C.blanc });
  ecrire(montant(doc.total_cents), W - M - 12, by + 14, { font: f.titreNoir, size: 18, color: C.moutarde, align: "right" });
  y = by - 20;
  ecrire(vendeur.mention_tva, W - M, y, { size: 8, color: C.sourdine, align: "right" });

  // ── Règlement et mot de fin (à gauche) ────────────────────────────────
  const lw = tx - M - 46;
  let ly = hautTotaux;
  const quand = dateLongue(doc.regle_le ?? doc.emis_le);
  etiquette(avoir ? "Remboursement" : "Règlement", M, ly);
  ly -= 15;
  const regle = avoir
    ? `Remboursé le ${quand} ${doc.moyen ? `sur ${doc.moyen}` : "sur le moyen de paiement d'origine"}.`
    : doc.total_cents === 0 ? "Montant entièrement couvert par la remise. Aucun montant restant dû." : `Payée le ${quand}${doc.moyen ? ` par ${doc.moyen}` : ""}. Aucun montant restant dû.`;
  for (const s of couper(propre(regle), f.texteFort, 9.5, lw)) { ecrire(s, M, ly, { font: f.texteFort, size: 9.5 }); ly -= 12.5; }
  ly -= 16;
  ecrire(avoir ? "Votre remboursement est en route." : "Merci de faire vivre la tribune.", M, ly, { font: f.groovy, size: 13, color: C.vin });
  ly -= 16;
  for (const s of couper(propre(`Une question sur ce document ? Écrivez-nous à ${vendeur.email} en rappelant son numéro.`), f.texte, 9, lw)) { ecrire(s, M, ly, { size: 9, color: C.sourdine }); ly -= 11.5; }

  // ── Pied de page ──────────────────────────────────────────────────────
  const fy = M + 44;
  page.drawLine({ start: { x: M, y: fy }, end: { x: W - M, y: fy }, thickness: 0.6, color: C.trait });
  const mentions = [
    `Ambiance Rugby - ${vendeur.nom}, entrepreneur individuel - SIRET ${vendeur.siret} - ${vendeur.adresse}.`,
    `${vendeur.mention_tva}. Pénalités de retard : trois fois le taux d'intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40 € (clients professionnels). Pas d'escompte pour paiement anticipé.`,
  ];
  let ty = fy - 15;
  for (const p of mentions) for (const s of couper(propre(p), f.texte, 7.5, W - 2 * M)) { ecrire(s, M, ty, { size: 7.5, color: C.sourdine }); ty -= 10; }
  ecrire(`${titre} ${doc.numero} - page 1/1`, W - M, M - 18, { size: 7, color: C.sourdine, align: "right" });

  return pdf.save();
}

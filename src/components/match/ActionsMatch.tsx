"use client";
import { useState } from "react";
import Volet, { ActionVolet } from "@/components/app/Volet";

const ics = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Bouton « … » de la fiche match : partager, copier le lien, ajouter au calendrier, alertes. */
export default function ActionsMatch({ titre, coupEnvoi, lieu, aVenir, competition }: { titre: string; coupEnvoi: string; lieu: string | null; aVenir: boolean; competition: { nom: string; href: string } }) {
  const [ouvert, setOuvert] = useState(false);
  const [copie, setCopie] = useState(false);
  const url = () => location.href.split("#")[0];

  const partager = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: titre, text: `${titre} sur Ambiance Rugby`, url: url() }); setOuvert(false); return; }
    } catch { return; }
    copier();
  };
  const copier = async () => {
    try { await navigator.clipboard.writeText(url()); setCopie(true); setTimeout(() => setCopie(false), 1800); } catch { /* */ }
  };
  const calendrier = () => {
    const debut = new Date(coupEnvoi), fin = new Date(debut.getTime() + 2 * 3600e3);
    const texte = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ambiance Rugby//FR", "BEGIN:VEVENT", `UID:${debut.getTime()}-${titre.length}@ambiance-rugby.fr`,
      `DTSTAMP:${ics(new Date())}`, `DTSTART:${ics(debut)}`, `DTEND:${ics(fin)}`, `SUMMARY:${titre.replace(/[,;]/g, " ")}`,
      lieu ? `LOCATION:${lieu.replace(/[,;]/g, " ")}` : "", `URL:${url()}`, `DESCRIPTION:${competition.nom} - Suivez le match en direct sur Ambiance Rugby`,
      "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:Coup d'envoi dans 30 minutes", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([texte], { type: "text/calendar" })), download: "match.ics" });
    a.click();
    setOuvert(false);
  };

  const ico = (d: string) => <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden><path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} aria-label="Partager et plus" aria-haspopup="dialog"
        className="w-10 h-10 rounded-full grid place-items-center bg-teinte text-vin active:scale-90 transition-transform shrink-0">
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <Volet ouvert={ouvert} fermer={() => setOuvert(false)} titre={titre}>
        <ActionVolet onClick={partager} icone={ico("M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6")} sous="Messages, WhatsApp, Instagram…">Partager le match</ActionVolet>
        <ActionVolet onClick={copier} icone={ico(copie ? "m5 12 5 5 9-10" : "M9 9h10v10H9zM5 15V5h10")}>{copie ? "Lien copié" : "Copier le lien"}</ActionVolet>
        {aVenir && <ActionVolet onClick={calendrier} icone={ico("M4 6h16v14H4zM4 10h16M8 3v4M16 3v4")} sous="Avec un rappel 30 min avant">Ajouter à mon calendrier</ActionVolet>}
        <ActionVolet href="/compte/alertes" icone={ico("M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4")} sous="Coup d'envoi, essais, score final">Mes alertes</ActionVolet>
        <ActionVolet href={competition.href} icone={ico("M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3")} sous="Classement et calendrier">{competition.nom}</ActionVolet>
      </Volet>
    </>
  );
}

"use client";
/** Ouvre la fenêtre d'impression : « Enregistrer au format PDF » donne la facture en PDF. */
export default function BoutonImprimer() {
  return <button type="button" onClick={() => window.print()} className="bouton-or no-print">Télécharger en PDF</button>;
}

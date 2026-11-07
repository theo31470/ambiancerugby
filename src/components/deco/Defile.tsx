import { Ballon, Beret, Echarpe, Pinte, Poteaux, Trompette } from "./Icones";

const MOTS = ["Essai", "Troisième mi-temps", "Mêlée", "Allez les gars", "Banda", "En avant", "Drop", "Ola", "Plaquage", "Coup d'envoi", "Touche", "Chistera"];
const ICONES = [Ballon, Pinte, Poteaux, Echarpe, Trompette, Beret];

/** Bande inclinée qui défile en continu : mots du rugby et icônes de tribune. */
export default function Defile({ ton = "or", inverse = false, incline = -2, className = "" }: { ton?: "or" | "vin" | "bordeaux"; inverse?: boolean; incline?: number; className?: string }) {
  const couleurs = {
    or: "bg-moutarde text-bordeaux",
    vin: "bg-vin text-white",
    bordeaux: "bg-bordeaux text-moutarde",
  }[ton];
  const suite = MOTS.map((mot, i) => {
    const Icone = ICONES[i % ICONES.length];
    return (
      <span key={i} className="flex items-center gap-5 pr-5 shrink-0">
        <span className="groovy text-2xl sm:text-3xl whitespace-nowrap">{mot}</span>
        <Icone className="h-7 sm:h-8 w-auto" />
      </span>
    );
  });
  return (
    <div className={`pleine-largeur overflow-hidden ${className}`} aria-hidden>
      <div className={`bande-defile ${couleurs} py-2.5 sm:py-3 shadow-[0_6px_0_-2px_rgba(0,0,0,.12)]`} style={{ transform: `rotate(${incline}deg) scale(1.04)` }}>
        <div className={`defile ${inverse ? "defile-inverse" : ""}`}>
          {suite}
          {suite}
        </div>
      </div>
    </div>
  );
}

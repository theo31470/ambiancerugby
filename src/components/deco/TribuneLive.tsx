"use client";
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { Ballon, Echarpe, Pinte, Sifflet, Trompette } from "./Icones";
import { clameur, sonActif } from "@/lib/son";

const CRIS = [
  { id: "allez", texte: "Allez !", Icone: Echarpe, cls: "bg-moutarde text-bordeaux" },
  { id: "essai", texte: "Quel essai !", Icone: Ballon, cls: "bg-vin text-white" },
  { id: "arbitre", texte: "Oh l'arbitre !", Icone: Sifflet, cls: "bg-white text-bordeaux" },
  { id: "banda", texte: "Banda !", Icone: Trompette, cls: "bg-rose text-bordeaux" },
  { id: "sante", texte: "Santé !", Icone: Pinte, cls: "bg-moutarde text-bordeaux" },
] as const;
type CriId = (typeof CRIS)[number]["id"];
type Bulle = { k: number; id: CriId; x: number };

/**
 * La tribune en direct : tous ceux qui regardent la fiche du match en même temps
 * se voient (compteur) et s'envoient des cris qui s'envolent à l'écran.
 * Temps réel Supabase (broadcast + presence), rien n'est stocké.
 */
export default function TribuneLive({ matchId, enDirect }: { matchId: string; enDirect: boolean }) {
  const [bulles, setBulles] = useState<Bulle[]>([]);
  const [presents, setPresents] = useState(1);
  const [compte, setCompte] = useState<Record<string, number>>({});
  const canal = useRef<ReturnType<ReturnType<typeof browserClient>["channel"]> | null>(null);
  const dernier = useRef(-1000);
  const k = useRef(0);

  const afficher = (id: CriId) => {
    const b = { k: ++k.current, id, x: 8 + Math.random() * 84 };
    setBulles((l) => [...l.slice(-24), b]);
    setCompte((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    setTimeout(() => setBulles((l) => l.filter((x) => x.k !== b.k)), 2600);
  };

  useEffect(() => {
    const supabase = browserClient();
    const moi = Math.random().toString(36).slice(2);
    const ch = supabase.channel(`tribune-${matchId}`, { config: { broadcast: { self: false }, presence: { key: moi } } });
    ch.on("broadcast", { event: "cri" }, ({ payload }: { payload: { id: CriId } }) => {
      if (CRIS.some((c) => c.id === payload?.id)) afficher(payload.id);
    })
      .on("presence", { event: "sync" }, () => setPresents(Math.max(1, Object.keys(ch.presenceState()).length)))
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") void ch.track({ t: Date.now() });
      });
    canal.current = ch;
    return () => {
      supabase.removeChannel(ch);
    };
  }, [matchId]);

  const crier = (id: CriId, quand: number) => {
    if (quand - dernier.current < 700) return; // pas de spam
    dernier.current = quand;
    afficher(id);
    void canal.current?.send({ type: "broadcast", event: "cri", payload: { id } });
    if (id === "essai" && sonActif()) clameur(0.5);
  };

  return (
    <section aria-labelledby="h-tribune" className="mt-10 relative overflow-hidden rounded-[1.75rem] bg-bordeaux text-white p-5 sm:p-7">
      {/* les cris s'envolent */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {bulles.map((b) => {
          const c = CRIS.find((x) => x.id === b.id)!;
          return (
            <span key={b.k} className={`cri-envol absolute bottom-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold shadow ${c.cls}`} style={{ left: `${b.x}%` }}>
              <c.Icone className="h-4 w-auto" />{c.texte}
            </span>
          );
        })}
      </div>
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="h-tribune" className="groovy text-3xl">La tribune {enDirect ? "en direct" : ""}</h2>
          <p className="text-sm text-white/70 mt-1">
            <span className="inline-flex items-center gap-1.5"><span className="pastille" aria-hidden />{presents} supporter{presents > 1 ? "s" : ""} sur cette page</span>
          </p>
        </div>
      </div>
      <div className="relative mt-5 flex flex-wrap gap-2" role="group" aria-label="Lancer un cri">
        {CRIS.map((c) => (
          <button key={c.id} onClick={(e) => crier(c.id, e.timeStamp)} className={`group inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold transition-transform hover:-translate-y-0.5 active:scale-95 ${c.cls}`}>
            <c.Icone className="h-5 w-auto group-active:animate-[roulis_.5s_ease-in-out]" />
            {c.texte}
            {compte[c.id] ? <span className="text-xs opacity-70 tnum">{compte[c.id]}</span> : null}
          </button>
        ))}
      </div>
      <p className="relative mt-4 text-xs text-white/60">Vos cris s&apos;affichent en direct chez tous ceux qui regardent ce match.</p>
    </section>
  );
}

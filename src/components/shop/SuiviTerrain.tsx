import { Ballon, Poteaux } from "@/components/deco/Icones";
import type { Commande } from "@/lib/shop/admin";
import type { Etape } from "@/lib/shop/lecture";

const ETAPES = [
  { statut: "payee", titre: "Payée", detail: "Coup d'envoi : paiement reçu" },
  { statut: "en_fabrication", titre: "En fabrication", detail: "Impression à l'atelier" },
  { statut: "expediee", titre: "Expédiée", detail: "Le colis est en route" },
  { statut: "livree", titre: "Livrée", detail: "Essai aplati chez vous" },
] as const;
const RANG: Record<string, number> = { payee: 0, en_fabrication: 1, expediee: 2, livree: 3 };

const quand = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : null);

/** Le suivi de commande en terrain de rugby : le ballon avance d'une ligne à chaque étape, jusqu'à l'essai entre les poteaux. */
export default function SuiviTerrain({ c, etapes }: { c: Commande; etapes: Etape[] }) {
  const rang = RANG[c.statut] ?? -1;
  const avance = rang < 0 ? 0 : (rang / 3) * 100;
  const dates = [c.paye_at, c.fabrication_at, c.expedie_at, c.livre_at];
  const arrete = ["annulee", "remboursee", "probleme"].includes(c.statut);

  return (
    <div>
      {/* le terrain */}
      <div className="relative rounded-3xl overflow-hidden bg-[#2f6b3a] text-white px-6 sm:px-10 pt-14 pb-10" role="img"
        aria-label={`Avancement : ${rang >= 0 ? ETAPES[rang].titre : "en attente"}`}>
        {/* bandes de pelouse */}
        <div aria-hidden className="absolute inset-0 opacity-25" style={{ background: "repeating-linear-gradient(90deg, transparent 0 60px, rgba(255,255,255,.12) 60px 120px)" }} />
        {/* lignes du terrain */}
        <div aria-hidden className="absolute inset-y-6 left-6 sm:left-10 right-20 sm:right-28 flex justify-between">
          {[0, 1, 2, 3].map((i) => <span key={i} className={`w-0.5 bg-white/40 ${i === 3 ? "bg-white/80" : ""}`} />)}
        </div>
        <Poteaux className="absolute right-3 sm:right-8 bottom-4 h-36 sm:h-44 w-auto text-white" />
        {rang === 3 && <p className="suivi-essai absolute right-6 sm:right-12 top-3 left-auto groovy text-3xl sm:text-4xl text-moutarde drop-shadow" style={{ transform: "translateX(-50%)" }}>Essai !</p>}

        <div className="relative mr-20 sm:mr-28 h-16">
          <span className="suivi-ballon absolute top-1/2 -translate-y-1/2 -ml-6" style={{ ["--avance" as string]: `${avance}%`, ["--tours" as string]: `${(rang + 1) * 360}deg` }}>
            <span className="block"><Ballon className="w-12 text-moutarde drop-shadow-[0_4px_0_rgba(0,0,0,.25)]" /></span>
          </span>
        </div>

        <ol className="relative mr-20 sm:mr-28 mt-6 grid grid-cols-4 gap-2 text-center">
          {ETAPES.map((e, i) => {
            const fait = !arrete && i <= rang;
            return (
              <li key={e.statut} className="grid justify-items-center gap-1">
                <span className={`w-5 h-5 rounded-full border-2 border-white ${fait ? "bg-moutarde etape-faite" : "bg-transparent"}`} style={{ ["--i" as string]: i }} aria-hidden />
                <span className={`text-sm font-bold ${fait ? "" : "text-white/60"}`}>{e.titre}</span>
                <span className="hidden sm:block text-xs text-white/70">{fait ? quand(dates[i]) ?? e.detail : e.detail}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {arrete && (
        <p role="status" className="mt-4 rounded-xl bg-alerte/10 text-alerte px-4 py-3 font-semibold">
          {c.statut === "annulee" ? "Cette commande a été annulée." : c.statut === "remboursee" ? "Cette commande a été remboursée." : "Un souci est survenu sur cette commande : nous revenons vers vous très vite par e-mail."}
        </p>
      )}

      {c.suivi_numero && (
        <div className="mt-5 flex flex-wrap items-center gap-3 bg-surface border border-trait rounded-2xl p-4">
          <span>Colis confié à <strong>{c.transporteur}</strong>, n° <span className="tnum font-semibold">{c.suivi_numero}</span></span>
          {c.suivi_url && <a href={c.suivi_url} target="_blank" rel="noopener noreferrer" className="bouton-discret ml-auto">Suivre chez le transporteur</a>}
        </div>
      )}

      <h2 className="mt-8 font-bold text-lg">Le fil de la commande</h2>
      <ol className="mt-3 border-l-2 border-trait ml-2">
        {[...etapes].reverse().map((e, i) => (
          <li key={i} className="relative pl-5 py-2">
            <span className="absolute -left-[7px] top-3.5 w-3 h-3 rounded-full bg-vin border-2 border-fond" aria-hidden />
            <p className="text-sm"><span className="font-semibold">{e.message ?? ({ en_attente: "Commande créée", payee: "Paiement reçu", en_fabrication: "En fabrication", expediee: "Expédiée", livree: "Livrée", annulee: "Annulée", remboursee: "Remboursée", probleme: "À vérifier" } as Record<string, string>)[e.statut] ?? e.statut}</span></p>
            <p className="text-xs text-sourdine">{quand(e.date)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

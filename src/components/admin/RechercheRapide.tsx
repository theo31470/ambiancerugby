"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/client";

type Resultat = { href: string; titre: string; detail: string };

const PAGES: Resultat[] = [
  { href: "/admin", titre: "Aujourd'hui", detail: "Tableau de bord" },
  { href: "/admin/articles/nouveau", titre: "Écrire un article", detail: "Rédaction" },
  { href: "/admin/articles", titre: "Articles", detail: "Rédaction" },
  { href: "/admin/journee", titre: "Saisie de journée", detail: "Matchs et stats" },
  { href: "/admin/matchs", titre: "Matchs et direct", detail: "Matchs et stats" },
  { href: "/admin/stats-depart", titre: "Stats de départ", detail: "Matchs et stats" },
  { href: "/admin/clubs", titre: "Clubs", detail: "Clubs et joueurs" },
  { href: "/admin/joueurs", titre: "Joueurs", detail: "Clubs et joueurs" },
  { href: "/admin/donnees", titre: "Données et synchros", detail: "Réglages" },
  { href: "/admin/utilisateurs", titre: "Membres", detail: "Réglages" },
];

/** Recherche rapide (Ctrl+K) : pages de l'admin, clubs, joueurs et articles. */
export default function RechercheRapide() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState("");
  const [trouves, setTrouves] = useState<Resultat[]>([]);
  const [sel, setSel] = useState(0);
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOuvert((o) => !o); }
      if (e.key === "Escape") setOuvert(false);
    };
    window.addEventListener("keydown", clavier);
    return () => window.removeEventListener("keydown", clavier);
  }, []);
  useEffect(() => { if (ouvert) setTimeout(() => champ.current?.focus(), 10); }, [ouvert]);

  // recherche en base, avec un petit délai pendant la frappe
  useEffect(() => {
    const t = q.trim().replace(/[%,()]/g, "");
    if (t.length < 2) return;
    const id = setTimeout(async () => {
      const db = browserClient();
      const [clubs, joueurs, articles] = await Promise.all([
        db.from("teams").select("id,name").ilike("name", `%${t}%`).limit(5),
        db.from("players").select("id,first_name,last_name,team:teams(name)").or(`last_name.ilike.%${t}%,first_name.ilike.%${t}%`).limit(6),
        db.from("articles").select("id,title").ilike("title", `%${t}%`).limit(5),
      ]);
      setTrouves([
        ...((clubs.data ?? []) as { id: string; name: string }[]).map((c) => ({ href: `/admin/clubs/${c.id}`, titre: c.name, detail: "Club" })),
        ...((joueurs.data ?? []) as { id: string; first_name: string; last_name: string; team: unknown }[]).map((j) => ({ href: `/admin/joueurs/${j.id}`, titre: `${j.first_name} ${j.last_name}`, detail: `Joueur, ${(j.team as unknown as { name: string } | null)?.name ?? "sans club"}` })),
        ...((articles.data ?? []) as { id: string; title: string }[]).map((a) => ({ href: `/admin/articles/${a.id}`, titre: a.title, detail: "Article" })),
      ]);
      setSel(0);
    }, 200);
    return () => clearTimeout(id);
  }, [q]);

  const pages = PAGES.filter((p) => !q.trim() || p.titre.toLowerCase().includes(q.trim().toLowerCase()));
  const liste = [...pages, ...(q.trim().length >= 2 ? trouves : [])];
  const aller = (r: Resultat) => { setOuvert(false); setQ(""); router.push(r.href); };

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} className="flex items-center gap-2 rounded-full bg-surface border border-trait px-3.5 py-1.5 text-sm text-sourdine hover:border-vin w-full sm:w-72">
        <span aria-hidden>⌕</span>
        <span className="flex-1 text-left">Chercher un club, un joueur…</span>
        <kbd className="hidden sm:inline text-[11px] rounded border border-trait px-1.5">Ctrl K</kbd>
      </button>
      {ouvert && (
        <div className="fixed inset-0 z-[80] bg-bordeaux/60 backdrop-blur-sm grid place-items-start justify-center pt-[12vh] px-4" onClick={() => setOuvert(false)}>
          <div role="dialog" aria-modal="true" aria-label="Recherche rapide" className="w-full max-w-xl rounded-2xl bg-surface shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <input ref={champ} value={q} placeholder="Page, club, joueur ou article"
              onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length < 2) setTrouves([]); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, liste.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
                if (e.key === "Enter" && liste[sel]) aller(liste[sel]);
              }}
              aria-label="Rechercher"
              className="w-full px-5 py-4 text-lg bg-transparent border-b border-trait outline-none" />
            <ul className="max-h-[55vh] overflow-y-auto p-2" role="listbox">
              {liste.length === 0 && <li className="px-3 py-4 text-sourdine text-sm">Aucun résultat.</li>}
              {liste.map((r, i) => (
                <li key={r.href + i} role="option" aria-selected={i === sel}>
                  <button type="button" onMouseEnter={() => setSel(i)} onClick={() => aller(r)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left ${i === sel ? "bg-teinte" : ""}`}>
                    <span className="font-semibold flex-1 truncate">{r.titre}</span>
                    <span className="text-xs text-sourdine">{r.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

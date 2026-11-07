const OK: Record<string, string> = {
  publie: "Article publié.",
  brouillon: "Brouillon enregistré.",
  supprime: "Supprimé.",
  enregistre: "Modifications enregistrées.",
  lance: "Synchronisation lancée. Le résultat apparaît dans le journal d'ici une minute.",
  saison: "Saison mise à jour.",
  role: "Rôle mis à jour.",
};

export default function Notice({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const ok = typeof sp.ok === "string" ? OK[sp.ok] : null;
  const err = typeof sp.erreur === "string" ? sp.erreur : null;
  if (!ok && !err) return null;
  return (
    <p role={err ? "alert" : "status"} className={`mb-6 rounded-lg px-4 py-3 text-sm font-semibold ${err ? "bg-alerte/10 text-alerte" : "bg-ok/10 text-ok"}`}>
      {err ?? ok}
    </p>
  );
}

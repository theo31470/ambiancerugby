/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import Notice from "@/components/admin/Notice";
import { Field, Select } from "@/components/admin/Field";
import { saveCompetition, runSync } from "../../actions";

export default async function EditCompetition({ params, searchParams }: PageProps<"/admin/competitions/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const db = await createClient();
  const { data: c } = await db.from("competitions").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  return (
    <div>
      <Link href="/admin/competitions" className="text-sm text-sourdine underline underline-offset-4">Toutes les compétitions</Link>
      <div className="mt-2">
        <PageHeader titre={c.name} description={`Saison ${c.current_season}. Les matchs, équipes et classements arrivent tout seuls ; ici, vous réglez l'affichage.`}
          actions={<>
            <Link href={`/competitions/${c.slug}`} className="bouton-discret">Voir la page</Link>
            <form action={runSync}>
              <input type="hidden" name="job" value="competition" />
              <input type="hidden" name="slug" value={c.slug} />
              <input type="hidden" name="_back" value={`/admin/competitions/${c.id}`} />
              <button className="bouton-discret">Mettre à jour maintenant</button>
            </form>
          </>} />
      </div>
      <Notice sp={sp} />
      {/* aperçu en direct des couleurs */}
      <div className="mb-6 rounded-2xl p-5 flex items-center gap-4 max-w-xl" style={{ background: c.color ?? "var(--vin)", color: c.text_color ?? "#fff" }}>
        <span className="w-14 h-14 rounded-xl bg-white grid place-items-center p-1.5">{c.logo_url && <img src={c.logo_url} alt="" className="max-w-full max-h-full object-contain" />}</span>
        <span><span className="block titre font-extrabold text-lg">{c.name}</span><span className="text-sm opacity-80">Aperçu de la carte</span></span>
      </div>
      <form action={saveCompetition} className="grid gap-5 max-w-3xl">
        <input type="hidden" name="id" value={c.id} />
        <input type="hidden" name="_back" value={`/admin/competitions/${c.id}`} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label="Nom" defaultValue={c.name} required />
          <Field name="short_name" label="Nom court" defaultValue={c.short_name} hint="Utilisé dans les bandeaux et tableaux." />
          <Field name="country" label="Pays" defaultValue={c.country} />
          <Field name="region" label="Région affichée" defaultValue={c.region} hint="Ex. FRA, ANG, GAL, IRL" />
          <Field name="color" label="Couleur de fond" defaultValue={c.color} placeholder="#934F5E" type="text" hint="Format #RRGGBB" />
          <Field name="text_color" label="Couleur du texte" defaultValue={c.text_color} placeholder="#FFFFFF" />
          <Field name="logo_url" label="Adresse du logo" defaultValue={c.logo_url} hint="Ou envoyez une image ci-dessous : elle ne sera plus remplacée par la synchro." />
          <div>
            <label htmlFor="logo_file" className="etiquette">Envoyer un logo</label>
            <input id="logo_file" name="logo_file" type="file" accept="image/*" className="text-sm" />
          </div>
          <Select name="kind" label="Type" defaultValue={c.kind} options={[{ value: "league", label: "Championnat" }, { value: "cup", label: "Coupe" }, { value: "international", label: "International" }]} />
          <Select name="standings_mode" label="Classement" defaultValue={c.standings_mode} options={[{ value: "api", label: "Automatique (officiel ou calculé)" }, { value: "computed", label: "Toujours calculé" }, { value: "none", label: "Pas de classement (tests)" }]} />
          <Field name="sort_order" label="Ordre d'affichage" type="number" defaultValue={c.sort_order} hint="Plus petit = plus haut dans les listes." />
          <Field name="niveau" label="Niveau pour l'Indice" type="number" defaultValue={c.niveau} hint="1500 = élite (Top 14, Premiership). 1330 = Pro D2. 1180 = Nationale." />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="active" defaultChecked={c.active} /> Active sur le site</label>
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="is_featured" defaultChecked={c.is_featured} /> À la une</label>
        </div>
        <div><button className="bouton">Enregistrer</button></div>
      </form>
    </div>
  );
}

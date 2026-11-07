/* eslint-disable @next/next/no-img-element */
import { saveArticle, deleteArticle } from "@/app/admin/actions";
import { Area, Field, Select } from "./Field";
import { CATEGORIES, isoToParisLocal } from "@/lib/format";
import type { Article } from "@/lib/types";

export default function ArticleForm({ article, competitions, teams, back }: {
  article?: Article; competitions: { id: string; name: string }[]; teams: { id: string; name: string }[]; back: string;
}) {
  return (
    <>
      <form action={saveArticle} className="grid gap-5">
        {article && <input type="hidden" name="id" value={article.id} />}
        <input type="hidden" name="_back" value={back} />
        <Field name="title" label="Titre" required defaultValue={article?.title} />
        <Area name="excerpt" label="Chapô" rows={2} defaultValue={article?.excerpt} hint="Une ou deux phrases, affichées sous le titre et dans les listes." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select name="category" label="Rubrique" defaultValue={article?.category ?? "actu"} options={Object.entries(CATEGORIES).map(([value, label]) => ({ value, label }))} />
          <Select name="competition_id" label="Compétition" empty="Aucune" defaultValue={article?.competition_id} options={competitions.map((c) => ({ value: c.id, label: c.name }))} />
          <Select name="team_id" label="Club" empty="Aucun" defaultValue={article?.team_id} options={teams.map((t) => ({ value: t.id, label: t.name }))} />
        </div>
        <fieldset className="grid gap-3 sm:grid-cols-2 items-end">
          <legend className="etiquette">Photo de couverture</legend>
          <div>
            <label htmlFor="cover_file" className="text-sm text-sourdine">Envoyer une image (4 Mo max.)</label>
            <input id="cover_file" name="cover_file" type="file" accept="image/*" className="champ mt-1" />
          </div>
          <Field name="cover_url" label="ou coller l'adresse d'une image" defaultValue={article?.cover_url} placeholder="https://…" />
          {article?.cover_url && <img src={article.cover_url} alt="Couverture actuelle" className="w-48 rounded-md aspect-video object-cover" />}
        </fieldset>
        <Area name="content" label="Texte" rows={18} defaultValue={article?.content}
          hint={<>Mise en forme : <code>## Intertitre</code>, <code>**gras**</code>, <code>*italique*</code>, <code>- liste</code>, <code>[lien](https://…)</code>, <code>&gt; citation</code>.</>} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="slug" label="Adresse de la page" defaultValue={article?.slug} hint="Laissez vide pour la créer depuis le titre." />
          <Field name="published_at" type="datetime-local" label="Date de publication" defaultValue={article?.published_at ? isoToParisLocal(article.published_at) : ""} hint="Vide = maintenant. Une date future programme l'article." />
          <Select name="status" label="État" defaultValue={article?.status ?? "draft"} options={[{ value: "draft", label: "Brouillon" }, { value: "published", label: "Publié" }]} />
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="premium" defaultChecked={article?.premium} /> Exclusif Supporters : seul le premier paragraphe est visible pour les autres lecteurs
        </label>
        <div className="flex gap-3">
          <button className="bouton">Enregistrer</button>
          {article?.status === "published" && <a href={`/actus/${article.slug}`} className="bouton-discret" target="_blank">Voir l&apos;article</a>}
        </div>
      </form>
      {article && (
        <form action={deleteArticle} className="mt-10 border-t border-trait pt-6">
          <input type="hidden" name="id" value={article.id} />
          <input type="hidden" name="_back" value={back} />
          <button className="text-sm font-semibold text-alerte underline underline-offset-4">Supprimer définitivement cet article</button>
        </form>
      )}
    </>
  );
}

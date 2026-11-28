# Outils visuels Ambiance Rugby

- `xvdf.py` : thème XV de France (bleu nuit / rouge, Dupont en fond, logo FFR en filigrane).
  `python3 xvdf.py compo compo.json sortie.png` — `xv-test.json` = exemple (équipe du 13/11/2026).
  Les têtes viennent de `public/portraits/<slug>.webp` du site.
- `t14b.py` : thème Top 14 noir & or (or doux, logos clubs).
  `python3 t14b.py prog j10.json sortie.png` / `python3 t14b.py result scores.json sortie.png`.
- `clubs/` : logos Top 14 détourés. `ffr-logo.png` : coq France Rugby.
- Top 14 `ff` (face-à-face chiffré) et `duel` (écran partagé joueur + classement + points + forme) :
  `python3 t14b.py ff ff-lou-st.json out.png` / `python3 t14b.py duel duel-lou-st.json out.png`.
  Le duel utilise `decor.py` (décor stade étalonné + emblème 3D, `python3 decor.py <club> l|r out.png`)
  et les portraits agrandis par `sr_up.py` puis `decor.camera_raw_rgba`.
- `t14score.py` : affiche « score final » d'un match de Top 14 (noir & or, photo de match ou décor du vainqueur + joueur, phrase choc, bandeau score avec logos).
  `python3 t14score.py score-demo.json out.png` — clés : a, b, sa, sb, journee, p1, p2, photo (optionnel), pos, joueur, hdm.

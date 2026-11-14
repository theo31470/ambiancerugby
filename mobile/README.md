# Ambiance Rugby — app iOS & Android

App Capacitor qui charge le site en ligne (`https://ambiance-rugby.fr`).
Tout ce qui change sur le site (pages, animations, DA) apparaît dans l'app dès le déploiement Vercel,
sans mise à jour sur les stores.

Ce dossier est ignoré par Vercel (`.vercelignore`), TypeScript et ESLint du site.

## Installer

```bash
cd mobile
npm install
```

## Lancer l'app

- **Android** : installer [Android Studio](https://developer.android.com/studio), puis `npm run android`
  (ouvre le projet ; bouton ▶ pour lancer sur un téléphone branché ou un émulateur).
- **iOS** : il faut un Mac avec Xcode, puis `npm run ios`.
  Sans Mac : compilation dans le cloud (Codemagic, offre gratuite).

## Quand mettre à jour l'app sur les stores

Seulement si on touche à la partie native : `capacitor.config.ts`, icône, écran de démarrage, ajout d'un plugin.
Après chaque modification de ce type : `npm run sync`.

## Changer l'icône / l'écran de démarrage

Remplacer les images dans `assets/` (icône 1024×1024, splash 2732×2732), puis :

```bash
npm run assets && npm run sync
```

## Changer de domaine (ambiancerugby.fr)

Modifier `SITE` dans `capacitor.config.ts`, l'URL de `www/hors-ligne.html`, puis `npm run sync`.

## Infos stores

- Identifiant de l'app : `fr.ambiancerugby.app` (définitif une fois publié)
- Apple Developer : 99 $/an — Google Play Console : 25 $ une fois

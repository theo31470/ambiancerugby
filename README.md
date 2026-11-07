# Ambiance Rugby

Média rugby : scores en direct, classements, calendriers, fiches clubs et joueurs, actus, comptes supporters (favoris, commentaires) et espace rédaction.

- **Site** : Next.js 16 (App Router), Tailwind CSS 4, hébergé sur Vercel. Chaque push sur `main` est mis en ligne.
- **Données** : Supabase (projet `ambiance-rugby`, Paris), avec sécurité ligne par ligne (RLS).
- **Synchronisation** : fonction Supabase `sync` (`supabase/functions/sync`), lancée par `pg_cron`.

## Données de match

| Source | Compétitions | Rythme |
| --- | --- | --- |
| Oanor Rugby API (gratuit, 3 000 appels/mois) | Top 14, Champions Cup, Premiership, URC, Super Rugby, Rugby Championship, Coupe du monde | chaque matin + toutes les 10 min pendant les matchs |
| API-Sports Rugby (gratuit, saisons passées) | historique de toutes les compétitions | import manuel depuis la rédaction |
| Rédaction | Pro D2, Six Nations, Challenge Cup, tests | saisie en direct dans `/admin/matchs` |

Pour les compétitions saisies par la rédaction, le classement se recalcule tout seul à chaque score (4 pts victoire, 2 nul, bonus offensif à +3 essais, bonus défensif à 5 points ou moins).

Clés à renseigner dans Supabase → Edge Functions → Secrets : `OANOR_KEY`, `APISPORTS_KEY`.

## Rédaction

Le compte `theosarrat@gmail.com` devient administrateur à l'inscription. L'espace `/admin` permet d'écrire des articles (Markdown, photos), de saisir les matchs et le score en direct, de gérer clubs, joueurs, saisons et rôles.

## Développement

```bash
cp .env.example .env.local
npm install
npm run dev
```

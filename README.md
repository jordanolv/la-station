# The Ridge — bot Discord

Bot Discord modulaire (TypeScript, discord.js, MongoDB), déployé sur VPS via PM2.

## Environnements

| Env | Branche | App PM2 | Dossier VPS | Déclencheur |
|---|---|---|---|---|
| Production | `main` | `the-ridge-prod` | `~/projects/theridge-bot/prod` | push sur `main` |
| Staging | `dev` | `the-ridge-staging` | `~/projects/theridge-bot/dev` | push sur `dev` |

Le nom de l'app PM2 vient de `APP_ENV`, passé par le workflow de déploiement.
Chaque dossier VPS a son propre `.env` (jamais commité).

## Flow de travail

```
feat/xxx ──PR──► dev ──PR──► main
                  │            │
               staging        prod
```

1. Brancher depuis `dev` : `git switch dev && git pull && git switch -c feat/xxx`
2. PR vers `dev`. La CI (`npm run build`) doit passer, pas de push direct.
3. Le merge sur `dev` déploie staging. On teste là.
4. Quand c'est bon : PR `dev` → `main` (merge commit, pas de squash — sinon les
   deux branches divergent pour toujours). Le merge déploie la prod.

`main` et `dev` sont protégées : PR obligatoire, CI verte, pas de force-push.

## Commandes

```bash
npm run dev      # lancer en local (swc, pas de build)
npm run watch    # idem avec rechargement à chaud
npm run build    # tsc + tsc-alias + copie des assets — c'est ce que la CI vérifie
npm start        # pm2 startOrReload (sur le VPS, avec APP_ENV)
```

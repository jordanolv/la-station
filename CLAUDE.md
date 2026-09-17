# CLAUDE.md — The Ridge Bot

Bot Discord communautaire du serveur The Ridge. TypeScript, Discord.js v14, MongoDB/TypeGoose, PM2.

## Stack

- **Runtime** : Node.js 22, TypeScript, `@swc-node/register` (pas de build en dev), nodemon pour le watch
- **Discord** : discord.js v14, Components V2 (ContainerBuilder, SectionBuilder, etc.)
- **Base de données** : MongoDB via Mongoose + TypeGoose
- **Cron** : package `cron` v4 (`CronJob`)
- **Process manager** : PM2 (`ecosystem.config.cjs`)
- **Timezone** : Europe/Paris pour tous les crons

## Lancer le bot

```bash
npm run dev      # swc, pas de build
npm run watch    # idem + rechargement à chaud
npm run build    # tsc + tsc-alias + copie des assets — ce que vérifie la CI
```

Les variables d'env sont dans `.env` (ne jamais committer).

## Git et environnements

| Env | Branche | App PM2 | Dossier VPS |
|---|---|---|---|
| Production | `main` | `the-ridge-prod` | `~/projects/theridge-bot/prod` |
| Staging | `dev` | `the-ridge-staging` | `~/projects/theridge-bot/dev` |

```
feat/xxx ──PR──► dev ──PR──► main
                  │            │
               staging        prod
```

`main` et `dev` sont protégées : PR obligatoire, CI (`npm run build`) verte, pas de
force-push. Jamais de commit direct sur ces deux branches — brancher depuis `dev`.

Le merge sur `dev` déploie staging, le merge sur `main` déploie la prod. Promotion
`dev` → `main` en **merge commit**, pas en squash : un squash ferait diverger les
deux branches définitivement.

Le nom de l'app PM2 vient de `APP_ENV`, passé par le workflow de déploiement.

## Architecture

```
src/
├── bot/           # Client Discord, handlers events/features
├── config/        # commands.json
├── features/      # Une feature = un dossier autonome
│   ├── activity-roles/  bet/        cdm/         chat-gaming/
│   ├── admin/           config-panel/            draft/
│   ├── arcade/          group/      impostor/    leveling/
│   ├── party/           peak-hunters/            personality-test/
│   ├── quiz/            stats/      suggestion/  user/
│   ├── voice/
│   └── discord/   # Events globaux (ready, messageCreate, interactionCreate)
└── shared/        # cron, logs, guild, db, hooks, time, components, weekly-recap
```

Chaque feature suit la même structure :

```
feature/
├── models/        # TypeGoose models (Mongoose)
├── repositories/  # Accès BDD (findById, create, update...)
├── services/      # Logique métier
├── slash/         # Commandes slash Discord
├── panels/        # Panels admin (ConfigPanel)
├── cron/          # Jobs planifiés
└── events/        # Event listeners Discord
```

## Patterns clés

### Modèles TypeGoose

```ts
import { prop, getModelForClass } from '@typegoose/typegoose';
import { DocumentType } from '@typegoose/typegoose';

class MyModel {
  @prop({ required: true })
  field!: string;

  @prop({ default: 0 })
  count!: number;
}

const MyModelDB = getModelForClass(MyModel, {
  schemaOptions: { collection: 'my_collection' },
});

export type IMyModel = DocumentType<MyModel>;
export default MyModelDB;
```

### Panels admin (ConfigPanel)

Format customId : `cpanel:panelId:action`

```ts
export class MyPanel implements ConfigPanel {
  id = 'my-panel';

  async render(interaction): Promise<void> {
    // Construire l'UI avec ContainerBuilder, SectionBuilder...
    await interaction.reply({ components: [...], flags: MessageFlags.IsComponentsV2 });
  }

  async handleButton(interaction, client): Promise<void> {
    const id = interaction.customId.split(':')[2]; // ← toujours [2]
    if (id === 'my_action') { ... }
  }

  async handleSelectMenu(interaction, client): Promise<void> {
    const id = interaction.customId.split(':')[2];
    ...
  }
}
```

Enregistrement dans `src/features/discord/events/ready.ts` :

```ts
panelRegistry.register(new MyPanel());
```

### Cron managers

```ts
// cron/my-feature.cron.ts
export class MyFeatureCron {
  private job: CronJob;

  constructor(client: BotClient) {
    this.job = new CronJob('0 0 0 * * 1', this.run.bind(this), null, false, 'Europe/Paris');
  }

  public start() { this.job.start(); }
  public stop() { this.job.stop(); }
  private async run() { ... }
}

// cron/index.ts
export class MyFeatureCronManager {
  static start(client: BotClient) { new MyFeatureCron(client).start(); }
}
```

Enregistrement dans `src/shared/cron/cron-manager.ts`.

### VoicePlugin

Pour hooker dans les sessions vocales, implémenter `VoicePlugin` et enregistrer dans le VoicePluginManager. Les hooks disponibles : `onSessionStart`, `onSessionEnd`, `onTick`.

## Modèle User — champs importants

```ts
stats: {
  totalMsg: number           // total messages bruts
  messageHistory: [{ date, count }]  // 1 entrée par jour, tous les messages
  voiceTime: number          // total secondes de voc (cumulatif)
  voiceHistory: [{ date, time }]     // 1 entrée par jour, secondes de voc
  activityPoints: number     // points semaine en cours (voc + msgs), reset lundi
  dailyStreak: number
  arcade: { shifumi, puissance4, morpion, battle }
}
profil: { money, exp, lvl }
```

## Système activityPoints

Chaque lundi minuit (Paris), `ActivityRolesService.run()` :

1. Lit `activityPoints` sur chaque user
2. Trie et attribue les rôles selon les seuils %
3. Reset `activityPoints` à 0 via `updateMany`

**Accumulation des points :**

- **Voc** : 1 seconde = 1 point (ajouté dans `StatsService.applyVoiceSegmentsToUser`)
- **Messages** : cooldown 30min en RAM (`Map<userId, timestamp>`), 1 slot valide = 450 points (= 25% du voc à activité égale)

**Rôles (configurables via panel admin) :**

- Top 3 → Podium
- Top `activeThresholdPercent`% (défaut 10%) → Campeur
- Top `regularThresholdPercent`% (défaut 60%) → Explorateur
- Reste → Void

Les seuils % sont calculés sur `users.length` (tous les users en BDD).

## Peak Hunters (montagnes)

Dossier `src/features/peak-hunters/` — la feature s'appelait `mountain`, les customId
ont gardé le préfixe `mountain:` (ex: `mountain:home`). Ne pas les renommer sans migration.

### Format des données (`src/features/peak-hunters/data/mountains.json`)

```ts
{
  mountainLabel: string      // nom affiché (première lettre maj)
  elevation: string          // altitude brute en mètres (ex: "8848.86")
  countries: string[]        // ex: ["Népal", "République populaire de Chine"]
  flags: string[]            // ex: ["🇳🇵", "🇨🇳"] — même index que countries
  image: string              // URL Cloudinary (c_fill,w_800,h_450)
  article: string            // URL Wikipedia — sert aussi à dériver l'id
  rarity: MountainRarity     // "common" | "rare" | "epic" | "legendary"
}
```

L'`id` est dérivé du slug Wikipedia dans `loadMountains()` (ex: `Everest`). Ne pas ajouter de champ `id` dans le JSON.

### Seuils de rareté (par altitude)

- `legendary` : ≥ 7000 m
- `epic` : 4250–6999 m
- `rare` : 3000–4249 m
- `common` : < 3000 m

### Helpers MountainService

- `MountainService.getAltitude(m)` → `"8 849 m"`
- `MountainService.getCountryDisplay(m)` → `"🇳🇵 Népal  ·  🇨🇳 République populaire de Chine"`
- Ne jamais accéder à `m.name`, `m.flag`, `m.country`, `m.altitude` — ils n'existent pas.

### Commande `/peak-hunters`

Point d'entrée unique → `executeHome` affiche les stats + 3 boutons (Collection, Packs, Classement).
Chaque bouton embarque le `lastMsgId` dans son customId (`mountain:home:ACTION:LAST_MSG_ID`) pour supprimer le message précédent à chaque navigation.

### Spawn

- Planifié via `MountainSpawnCron` (seul scheduler, `resumeOrPlanToday()` au démarrage)
- Ne pas appeler `MountainSpawnService.rehydrate()` depuis `ready.ts` → double spawn
- Le schedule du jour est persisté en BDD

### Images

- Hébergées sur Cloudinary dans `the-ridge/mountains/{slug}`
- Script d'upload : `scripts/upload-mountains.mjs`

## Système de patchnotes

- Données dans `src/features/admin/data/patchnotes.json` — tableau d'objets, le dernier est envoyé par `/patchnote`
- Structure : `{ version, timestamp, sections: [{ type: "new"|"update"|"fix", blocks: [{ title, items[] }] }] }`
- Commande `/patchnote` (admin) envoie les containers ComponentsV2 dans le channel courant
- **Contenu** : n'inclure que les changements visibles par les utilisateurs — pas de refacto, pas de corrections internes, pas de logs admin

## Conventions

- Pas d'`ephemeral: true` → utiliser `flags: 64` (ou `MessageFlags.Ephemeral`)
- Panels : ne jamais `deferUpdate` dans le router, laisser chaque panel gérer sa propre interaction
- Ownership des interactions : `interaction.message.interactionMetadata?.user.id`
- Toujours utiliser `split(':')[2]` pour extraire l'action d'un customId de panel
- Toutes les vues utilisent ComponentsV2 (`ContainerBuilder`) — ne pas revenir aux `EmbedBuilder` pour les nouvelles features sauf si l'affichage est préférable
- Pattern navigation avec suppression du message précédent : embarquer le `lastMsgId` dans le customId, `deferUpdate` → delete → `followUp({fetchReply:true})` → `editReply` avec le nouveau msgId

## Style de code

- **Pas de commentaires inutiles** — c'est la règle la plus souvent enfreinte, y compris par les agents. Un commentaire n'est justifié que s'il répond à un *pourquoi* impossible à déduire du code : un contournement d'API, une contrainte externe, un piège non évident. À bannir :
  - le commentaire qui paraphrase la ligne suivante (`// Créer l'embed`, `// Vérifier si...`)
  - la section décorative (`// ===== HELPERS =====`)
  - le commentaire qui justifie un choix de conception — ça va dans le message de commit, la PR ou le README, pas dans le fichier
  - le commentaire signé ou préfixé par un outil / un agent
  - le TODO sans ticket ni date
  Dans le doute : renommer la variable ou extraire une fonction plutôt qu'écrire le commentaire.
- **Code découpé par feature** — chaque feature est autonome dans son dossier. Pas de logique métier qui déborde dans un autre module.
- **Une responsabilité par fichier** — services = logique, repositories = BDD, slash = interaction Discord. Ne pas mélanger.
- **Pas de duplication** — extraire une fonction dès qu'un bloc est utilisé 2 fois.
- **Nommage explicite** — un bon nom de fonction/variable vaut mieux qu'un commentaire.
- **Principes SOLID** — notamment SRP (une seule raison de changer) et DIP (dépendre des abstractions, pas des implémentations concrètes quand ça a du sens).
- **Features indépendantes** — une feature ne doit pas importer directement depuis une autre feature. Si deux features ont besoin de communiquer, passer par un service partagé dans `shared/`, un event Discord, ou un plugin (ex: `VoicePlugin`). Les couplages directs entre features rendent le code fragile et difficile à maintenir.

## grepai

Recherche sémantique par défaut (voir `~/.claude/GREPAI.md`). Requêtes en anglais,
`--json --compact` pour économiser les tokens.

`grepai trace` pour le graphe d'appels — indispensable avant de modifier une fonction
partagée, pour voir tous ses appelants :

```bash
grepai trace callers "applyVoiceSegmentsToUser" --json
grepai trace callees "run" --json
grepai trace graph "ActivityRolesService" --depth 3 --json
```

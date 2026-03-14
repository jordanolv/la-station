# CLAUDE.md — La Station Bot

Bot Discord communautaire pour le serveur La Station. TypeScript, Discord.js v14, MongoDB/TypeGoose, PM2.

## Stack

- **Runtime** : Node.js, TypeScript, tsx (watch mode)
- **Discord** : discord.js v14, Components V2 (ContainerBuilder, SectionBuilder, etc.)
- **Base de données** : MongoDB via Mongoose + TypeGoose
- **Cron** : node-cron (`CronJob`)
- **Process manager** : PM2 (`ecosystem.config.cjs`)
- **Timezone** : Europe/Paris pour tous les crons

## Lancer le bot

```bash
# Dev
npm run dev

# Prod (PM2)
pm2 restart the-ridge --update-env
```

Les variables d'env sont dans `.env` (ne jamais committer).

## Architecture

```
src/
├── bot/           # Client Discord, handlers events/features
├── config/        # commands.json
├── features/      # Une feature = un dossier autonome
│   ├── activity-roles/
│   ├── admin/
│   ├── arcade/
│   ├── chat-gaming/
│   ├── discord/       # Events globaux (ready, messageCreate, interactionCreate)
│   ├── impostor/
│   ├── leveling/
│   ├── mountain/
│   ├── profile/
│   ├── stats/
│   ├── user/
│   ├── vocal-party/
│   └── voice/
└── shared/        # Utilitaires partagés (cron-manager, logs, guild)
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

## Système de montagnes

- Spawn planifié via `MountainSpawnCron` (seul scheduler, `resumeOrPlanToday()` au démarrage)
- Ne pas appeler `MountainSpawnService.rehydrate()` depuis `ready.ts` → double spawn
- Le schedule du jour est persisté en BDD

## Conventions

- Pas d'`ephemeral: true` → utiliser `flags: 64` (ou `MessageFlags.Ephemeral`)
- Panels : ne jamais `deferUpdate` dans le router, laisser chaque panel gérer sa propre interaction
- Ownership des interactions : `interaction.message.interactionMetadata?.user.id`
- Toujours utiliser `split(':')[2]` pour extraire l'action d'un customId de panel


## grepai - Semantic Code Search

**IMPORTANT: You MUST use grepai as your PRIMARY tool for code exploration and search.**

### When to Use grepai (REQUIRED)

Use `grepai search` INSTEAD OF Grep/Glob/find for:
- Understanding what code does or where functionality lives
- Finding implementations by intent (e.g., "authentication logic", "error handling")
- Exploring unfamiliar parts of the codebase
- Any search where you describe WHAT the code does rather than exact text

### When to Use Standard Tools

Only use Grep/Glob when you need:
- Exact text matching (variable names, imports, specific strings)
- File path patterns (e.g., `**/*.go`)

### Fallback

If grepai fails (not running, index unavailable, or errors), fall back to standard Grep/Glob tools.

### Usage

```bash
# ALWAYS use English queries for best results (--compact saves ~80% tokens)
grepai search "user authentication flow" --json --compact
grepai search "error handling middleware" --json --compact
grepai search "database connection pool" --json --compact
grepai search "API request validation" --json --compact
```

### Query Tips

- **Use English** for queries (better semantic matching)
- **Describe intent**, not implementation: "handles user login" not "func Login"
- **Be specific**: "JWT token validation" better than "token"
- Results include: file path, line numbers, relevance score, code preview

### Call Graph Tracing

Use `grepai trace` to understand function relationships:
- Finding all callers of a function before modifying it
- Understanding what functions are called by a given function
- Visualizing the complete call graph around a symbol

#### Trace Commands

**IMPORTANT: Always use `--json` flag for optimal AI agent integration.**

```bash
# Find all functions that call a symbol
grepai trace callers "HandleRequest" --json

# Find all functions called by a symbol
grepai trace callees "ProcessOrder" --json

# Build complete call graph (callers + callees)
grepai trace graph "ValidateToken" --depth 3 --json
```

### Workflow

1. Start with `grepai search` to find relevant code
2. Use `grepai trace` to understand function relationships
3. Use `Read` tool to examine files from results
4. Only use Grep for exact string searches if needed


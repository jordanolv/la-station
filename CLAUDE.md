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

### Format des données (`src/features/mountain/data/mountains.json`)

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

### Commande `/mountain`
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

## Conventions

- Pas d'`ephemeral: true` → utiliser `flags: 64` (ou `MessageFlags.Ephemeral`)
- Panels : ne jamais `deferUpdate` dans le router, laisser chaque panel gérer sa propre interaction
- Ownership des interactions : `interaction.message.interactionMetadata?.user.id`
- Toujours utiliser `split(':')[2]` pour extraire l'action d'un customId de panel
- Toutes les vues utilisent ComponentsV2 (`ContainerBuilder`) — ne pas revenir aux `EmbedBuilder` pour les nouvelles features sauf si l'affichage est préférable
- Pattern navigation avec suppression du message précédent : embarquer le `lastMsgId` dans le customId, `deferUpdate` → delete → `followUp({fetchReply:true})` → `editReply` avec le nouveau msgId

## Style de code

- **Pas de commentaires inutiles** — on ne commente que ce qui n'est pas évident à la lecture. Pas de `// Créer l'embed`, `// Vérifier si...`, etc.
- **Code découpé par feature** — chaque feature est autonome dans son dossier. Pas de logique métier qui déborde dans un autre module.
- **Une responsabilité par fichier** — services = logique, repositories = BDD, slash = interaction Discord. Ne pas mélanger.
- **Pas de duplication** — extraire une fonction dès qu'un bloc est utilisé 2 fois.
- **Nommage explicite** — un bon nom de fonction/variable vaut mieux qu'un commentaire.
- **Principes SOLID** — notamment SRP (une seule raison de changer) et DIP (dépendre des abstractions, pas des implémentations concrètes quand ça a du sens).
- **Features indépendantes** — une feature ne doit pas importer directement depuis une autre feature. Si deux features ont besoin de communiquer, passer par un service partagé dans `shared/`, un event Discord, ou un plugin (ex: `VoicePlugin`). Les couplages directs entre features rendent le code fragile et difficile à maintenir.


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

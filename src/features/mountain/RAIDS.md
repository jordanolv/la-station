# Raids d'expédition — Design Document v2

## Concept

Un raid se déclenche aléatoirement sur le serveur : une montagne rare/épique/légendaire apparaît avec une barre de "points de vie". Le serveur entier doit cumuler des **activity points** (vocal + messages) pour la faire tomber dans un délai imparti. À la fin, un écran de résultats style Dofus distribue les récompenses proportionnelles à la contribution de chacun.

---

## Cycle de vie d'un raid

```
IDLE → ACTIVE → COMPLETED (succès)
              → FAILED (deadline dépassée, HP non tombés à 0)
```

### 1. Déclenchement (aléatoire)

- Un cron tourne régulièrement (ex: toutes les heures) et tire un dé
- Probabilité de lancer un raid basée sur l'heure et l'activité récente du serveur
- La montagne cible est tirée aléatoirement parmi les raretés ≥ **rare**
- Un seul raid actif à la fois, cooldown de 24h minimum entre deux raids
- Un embed est posté dans le channel de notification avec la montagne, la barre de HP et le timer

### 2. HP de la montagne (scaling par rareté et activité serveur)

Les HP sont calculés au lancement en fonction de l'**activité moyenne hebdomadaire du serveur** (`avgWeeklyPoints`) et d'un multiplicateur de rareté :

| Rareté | Multiplicateur HP | Durée |
|---|---|---|
| `rare` | 3× | 4–5 jours |
| `epic` | 7× | 5–6 jours |
| `legendary` | 15× | 6–7 jours |

La durée exacte est tirée aléatoirement dans la fourchette de la rareté au moment du lancement.

```
HP = avgWeeklyPoints * rarityMultiplier
```

`avgWeeklyPoints` = moyenne des `activityPoints` de la semaine précédente sur tous les users en BDD (calculé au lancement du raid).

> Exemple : si la moyenne hebdo est 5000 pts, une montagne épique a 35 000 HP. Si l'activité est faible, les HP s'adaptent — le raid reste accessible.

### 3. Contribution des participants

- Chaque **activity point** gagné pendant le raid (voc + messages) est ajouté au compteur global du raid
- Les points sont capturés via le hook `onSessionEnd` du VoicePlugin (`RaidPlugin`) pour le vocal
- Pour les messages : le service de tracking de messages existant appelle un hook `RaidService.addMessageContribution(userId, points)` à chaque slot de message validé
- L'embed de progression se met à jour toutes les **15 minutes** (cron)
- Notifications à **33%**, **66%** et **90%** des HP détruits

### 4. Fin du raid

- **Succès** : HP tombés à 0 avant la deadline → écran de résultats complet
- **Échec total** : deadline dépassée et < 50% des HP détruits → embed d'échec, aucune récompense
- **Échec partiel** : deadline dépassée mais ≥ 50% des HP détruits → récompenses de consolation réduite (XP et coins à 25% du barème normal, pas de drop de montagne, pas de tickets)

---

## Barre de vie (embed de progression)

```
⛰️ RAID EN COURS — Gasherbrum I  🟪 Épique

HP  ▓▓▓▓▓▓▓░░░░░░░░░  42%  (21 000 / 50 000 pts)

👥 17 participants   ⏳ 31h restantes
👑 jordan.  —  4 200 pts (20%)

→ Plus tu contribues, plus tu as de chances de décrocher la montagne !
```

La barre est générée en caractères Unicode (`▓` rempli, `░` vide), longueur fixe de 20 blocs.

---

## Écran de résultats (fin de combat style Dofus)

Posté dans le channel de notification à la fin du raid. Chaque participant reçoit un message **privé** (ou un embed dans le channel) récapitulatif :

```
🏆 EXPÉDITION TERMINÉE — Gasherbrum I  🟪

Participants : 17 survivants
Durée : 38h 22min

┌─────────────────────────────────────────┐
│  XP       +1 250  ✦                     │
│  Coins    +850    🪙                     │
│  Ticket   +1      🎟️  (+ 1 bonus)       │
│  Montagne ✅  débloquée !  🟪            │
└─────────────────────────────────────────┘

Ta contribution : 4 200 pts  (20% du raid)
```

Les montants varient selon la contribution individuelle (voir tableau ci-dessous).

---

## Récompenses (succès uniquement)

```
% contribution = ses_points_pendant_raid / total_points_raid * 100
```

| Récompense | Calcul |
|---|---|
| XP | `BASE_XP_raid[rarity] * (1 + contribution% / 100)` |
| Coins | `BASE_COINS_raid[rarity] * (1 + contribution% / 100)` |
| Ticket de pack | 1 garanti si éligible + 1 bonus si contribution > 10% |
| Drop de la montagne | `contribution%` de chance (ex: 20% de contribution → 20% de drop) |

### Bases de récompenses par rareté

| Rareté | XP base | Coins base |
|---|---|---|
| `rare` | 300 | 200 |
| `epic` | 700 | 500 |
| `legendary` | 1 500 | 1 000 |

### Paliers bonus

| Condition | Bonus |
|---|---|
| Top 1 contributeur | +1 ticket supplémentaire |
| Contribution > 25% | XP ×2 |
| Contribution > 50% | XP ×3 |

### Règles du drop de montagne

- Le drop est individuel — plusieurs personnes peuvent décrocher la même montagne
- Si déjà débloquée → fragments (selon rareté, comme pour les packs)
- Pas de plafond sur le % de chance

---

## Seuil de participation minimum (anti-passager clandestin)

Pour être **éligible aux récompenses**, un participant doit avoir contribué **au moins X% de la contribution moyenne** des autres participants :

```
contributionMoyenne = totalPoints / nbParticipants
seuilMinimum = contributionMoyenne * 0.3   (30% de la moyenne)
```

> Exemple : si la moyenne est 500 pts, il faut au moins 150 pts pendant le raid pour être éligible.

Ce seuil exclut les gens qui se connectent 5 minutes juste pour décrocher la montagne sans vraiment contribuer, mais reste accessible pour les petits contributeurs réguliers.

---

## Modèle de données

```ts
Raid {
  mountainId: string
  status: 'active' | 'completed' | 'failed'
  rarity: MountainRarity
  maxHp: number                // HP calculés au lancement
  currentHp: number            // HP restants (maxHp - totalPoints)
  startedAt: Date
  endsAt: Date
  progressMessageId?: string   // ID du message embed en cours (pour l'éditer)
  progressChannelId?: string
  participants: {
    userId: string
    contributedPoints: number
    rewarded: boolean
  }[]
}
```

---

## Architecture technique

```
RaidPlugin (VoicePlugin)
  └── onSessionEnd → RaidService.addVoiceContribution(userId, activeSeconds)

RaidMessageHook
  └── appelé depuis le tracking de messages → RaidService.addMessageContribution(userId, points)

RaidService
  ├── trySpawnRaid()           // appelé par le cron, décide si on lance un raid
  ├── startRaid(mountainId)
  ├── addContribution(userId, points)
  ├── updateProgressEmbed()
  ├── checkDeadline()
  └── distributeRewards()

RaidCron (toutes les 15min)
  ├── Met à jour l'embed de progression
  └── Vérifie les deadlines dépassées + tente un spawn si pas de raid actif

RaidRepository
  └── CRUD sur le modèle Raid
```

### Intégration VoicePlugin

`RaidPlugin` s'enregistre comme les autres plugins via `VoiceSessionService.registerPlugin()`. À chaque `onSessionEnd`, il calcule les points vocaux de la session (même formule que `activityPoints`) et les ajoute à la contribution du raid actif.

### Intégration messages

Dans le service de tracking messages existant (là où le cooldown 30min est géré), après validation d'un slot, appeler `RaidService.addMessageContribution(userId, 450)` si un raid est actif.

---

## Embed de lancement du raid

```
⚔️ UN RAID COMMENCE !

Une montagne 🟪 Épique a été repérée...
Gasherbrum I — 8 080 m  🇵🇰 Pakistan

[image de la montagne]

HP     ░░░░░░░░░░░░░░░░░░░░  0%  (0 / 35 000 pts)
⏳ Temps restant : 48h

Gagnez des activity points (vocal + messages) pour la faire tomber !
→ Plus tu contribues, plus tu as de chances de la décrocher.
```

---

## Décisions actées

- ✅ **Révélation de la montagne** : visible dès le lancement (nom, image, rareté, altitude)
- ✅ **Résultats** : embed collectif posté dans le channel de notification (pas de DM)
- ✅ **Contributions vocales** : 1 seconde = 1 pt, identique à `activityPoints` (pas de multiplicateur spécial raid)
- ✅ **Échec partiel** : si ≥ 50% des HP détruits à la deadline → récompenses de consolation (XP + coins à 25%, pas de drop ni ticket)
- ✅ **Cooldown** : le prochain raid ne peut pas démarrer avant `startedAt + 14 jours` (la durée du raid est déduite — un légendaire de 7j laisse 7j de cooldown post-raid, un rare de 4j en laisse 10j)
- ✅ **Durée** : 4 jours minimum, 7 jours maximum (fourchette variable selon la rareté)
- ✅ **Commande admin** : `/mountain raid force` pour lancer un raid manuellement

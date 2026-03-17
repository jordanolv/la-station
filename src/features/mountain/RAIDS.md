# Raids d'expédition — Design Document

## Concept

Un admin lance un raid sur une montagne cible. Le serveur entier doit cumuler un objectif d'heures de vocal dans un délai imparti. À la fin, chaque participant reçoit des récompenses proportionnelles à sa contribution — et tente sa chance pour décrocher la montagne du raid.

---

## Cycle de vie d'un raid

```
PENDING → ACTIVE → COMPLETED
                 → FAILED (deadline dépassée, objectif non atteint)
```

### 1. Lancement (admin)
- Commande `/mountain raid start <montagne> <objectif_heures> <durée_heures>`
- La montagne cible peut être imposée ou tirée aléatoirement parmi les épiques/légendaires
- Un embed est posté dans le channel de notification avec la montagne, l'objectif et le timer
- Le raid passe en `ACTIVE`

### 2. Progression
- Chaque seconde de vocal active d'un member contribue au compteur global du raid
- Alimenété via le hook `onSessionEnd` du `VoicePlugin` existant (nouveau `RaidPlugin`)
- L'embed de progression se met à jour toutes les **30 minutes** (cron) ou à chaque session end
- Notifications à **50%** et **90%** de l'objectif atteint

### 3. Fin du raid
- **Succès** : objectif atteint avant la deadline → distribution des récompenses
- **Échec** : deadline dépassée → embed d'échec, pas de récompenses

---

## Récompenses (succès uniquement)

Chaque participant reçoit des récompenses **proportionnelles à son % de contribution** :

```
% contribution = ses_secondes / total_secondes_raid * 100
```

| Récompense | Calcul |
|---|---|
| XP | `BASE_XP * (1 + contribution%)` ex: 500 XP de base × multiplicateur |
| Coins | `BASE_COINS * (1 + contribution%)` |
| Tickets de pack | `1` garanti pour tous + `1` bonus si contribution > 10% |
| Drop de la montagne | `contribution%` de chance de drop (ex: 30% de contribution = 30% de chance) |

### Règles du drop
- Si la montagne est déjà débloquée → convertie en fragments (quantité selon rareté)
- Pas de cap sur les chances — quelqu'un à 60% de contribution a 60% de chance
- Le drop est individuel, plusieurs personnes peuvent drop la même montagne
- Participation minimale pour être éligible : **5 minutes** de vocal pendant le raid

### Paliers bonus (optionnel, à affiner)
| Contribution | Bonus |
|---|---|
| Top 1 contributeur | +1 ticket de pack supplémentaire |
| > 25% | Double XP |
| > 50% | Triple XP |

---

## Modèle de données

```ts
Raid {
  mountainId: string
  status: 'active' | 'completed' | 'failed'
  targetSeconds: number          // objectif en secondes
  currentSeconds: number         // cumul actuel
  startedAt: Date
  endsAt: Date                   // deadline
  participants: {
    userId: string
    contributedSeconds: number
    rewarded: boolean
  }[]
}
```

---

## Embed de progression (exemple)

```
⛰️ RAID EN COURS — Gasherbrum I (Épique 🟪)

▓▓▓▓▓▓▓░░░░░░░░░  42%
21h / 50h cumulées — 14 participants

⏳ Temps restant : 2j 6h
👑 Top contributeur : jordan. (8h30)

→ Plus tu contribues, plus tu as de chances de décrocher la montagne !
```

---

## Architecture technique

```
RaidPlugin (VoicePlugin)
  └── onSessionEnd → ajoute les secondes au raid actif en DB

RaidService
  ├── startRaid(mountainId, targetHours, durationHours)
  ├── addContribution(userId, seconds)
  ├── checkCompletion()
  └── distributeRewards()

RaidCron (toutes les 30min)
  ├── Met à jour l'embed de progression
  └── Vérifie les deadlines dépassées

RaidRepository
  └── CRUD sur le modèle Raid
```

### Intégration dans le VoicePlugin existant
Le `RaidPlugin` s'enregistre comme les autres plugins via `VoiceSessionService.registerPlugin()`. À chaque `onSessionEnd`, il vérifie s'il y a un raid actif et ajoute la contribution.

---

## Commandes

| Commande | Description |
|---|---|
| `/mountain raid start` | Lance un raid (admin) |
| `/mountain raid status` | Affiche la progression du raid actif |
| `/mountain raid end` | Force la fin d'un raid (admin) |

---

## Points ouverts / à décider

- [ ] Peut-il y avoir plusieurs raids simultanés ? (suggestion : non, un seul à la fois)
- [ ] L'objectif en heures est-il fixe ou scaled selon le nb de membres actifs du serveur ?
- [ ] La montagne du raid est-elle révélée dès le début ou seulement à la fin (effet surprise) ?
- [ ] Faut-il un cooldown entre deux raids ?
- [ ] Les raids échoués donnent-ils quand même une petite récompense de consolation ?

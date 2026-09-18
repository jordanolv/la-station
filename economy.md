# economy.md — L'économie de The Ridge

Ce document fixe les règles de l'économie du bot. Il existe parce que ces règles se
perdent entre deux sessions et que rien dans le code ne les rend évidentes.

**Avant de toucher à une valeur monétaire, lire ce fichier. Avant de le contredire,
le modifier.**

---

## État d'avancement

Rien de ce qui suit n'est en production, à une exception près. Ne pars pas du principe
que le code applique déjà ces règles.

| | État |
|---|---|
| Champ `flow` sur les logs économie | ✅ implémenté |
| Log du rake des bets (`burn`) | ✅ implémenté |
| Ancrage 1 RC ≈ 1 € | 🟡 décidé, pas appliqué |
| Redénomination ÷10 | 🟡 décidé, pas appliqué |
| Salaire hebdomadaire | ✅ implémenté, **désactivé** par défaut |
| Suppression du money/minute | 🟡 décidé, pas appliqué |
| Boutique (puits) | 🔴 à concevoir |

---

## 1. L'ancrage — la règle qui décide de tout

**1 RidgeCoin ≈ 1 euro.**

C'est la règle mère. Elle existe parce que « 750 coins » ne veut rien dire pour un
joueur : sans référentiel, aucun prix n'est lisible et aucun équilibrage n'est
vérifiable.

Conséquence pratique — pour fixer **n'importe quel** prix ou récompense, la question
n'est plus « ça me paraît combien ? » mais :

> Combien ça coûterait / rapporterait dans la vraie vie ?

Ne jamais nommer l'euro publiquement. L'échelle doit être familière sans que la
comparaison soit revendiquée : les joueurs la feront eux-mêmes, et c'est mieux ainsi.

---

## 2. Unité et stockage

**`profil.money` est un entier, en RidgeCoins entiers.** Pas de sous-unité, pas de
centimes.

Le code actuel fait `activeMinutes * 2.5` puis `user.profil.money += moneyGained`, ce
qui produit et accumule des soldes en **flottant**. Cette source disparaît avec le
money/minute (§3) ; partout où un calcul peut produire une fraction — le salaire au
prorata, en premier lieu — le résultat est arrondi avant écriture.

Une sous-unité a été envisagée puis écartée : avec un revenu médian de 210 RC par
semaine, une granularité de 1 RC pèse 0,5 % du revenu hebdomadaire. Elle coûterait un
refactor de tous les sites d'affichage pour un gain nul.

---

## 3. Source unique : le salaire hebdomadaire

**Il n'existe qu'une seule source de création monétaire : la paie du lundi.**

Le paiement du vocal à la minute est **supprimé**. L'XP à la minute est conservée —
ce n'est pas une monnaie, elle n'a pas de problème d'inflation.

### Pourquoi un salaire plutôt qu'un flux continu

Avec un paiement à la minute, l'émission est subie : si le serveur double son
activité, la monnaie créée double. Avec une masse salariale, l'émission est
**décidée**, et une hausse générale d'activité ne crée pas un centime de plus — elle
redistribue les parts.

C'est la seule propriété qui rend une grille de prix valable durablement.

### La formule

```
qualifiés   = users dont activityPoints >= SEUIL_QUALIFICATION
masse       = nb_qualifiés × BUDGET_PAR_ACTIF
smic        = BUDGET_PAR_ACTIF × PART_SMIC
pool_var    = masse − nb_qualifiés × smic

salaire(u)  = smic + (points(u) / total_points) × pool_var
```

### Les paramètres

| Paramètre | Valeur | Rôle |
|---|---:|---|
| `BUDGET_PAR_ACTIF` | 250 RC / semaine | revenu moyen visé par qualifié |
| `PART_SMIC` | 40 % (= 100 RC) | base fixe ; le reste est au prorata |
| `SEUIL_QUALIFICATION` | 3 600 pts | ≈ 1 h de vocal, ou ~8 créneaux de messages |

Les points ne changent pas : **1 s de vocal = 1 pt**, **1 créneau de 30 min contenant
au moins un message = 450 pts** (soit 25 % du vocal à durée égale).

### Trois choix de conception à ne pas défaire par accident

**Au prorata, jamais par palier.** Les rôles d'activité sont attribués par rang
(podium / campeur / explorateur / void) et c'est très bien pour des rôles. Un
*salaire* par rang est vicieux : si tout le monde double son activité, personne ne
change de rang et personne n'est mieux payé. Le prorata préserve l'incitation
individuelle.

**Le SMIC compresse volontairement l'écart.** Sur une distribution réaliste, l'écart
de points entre le premier et le dernier est de ~23×, l'écart de salaire de ~4,8×.
C'est l'objectif : le classement reste vrai, mais la monnaie reste utilisable par
tout le monde. Baisser `PART_SMIC` étire l'échelle, la monter l'écrase.

| `PART_SMIC` | Médiane | Min | Max | Écart |
|---|---:|---:|---:|---:|
| 25 % | 200 | 88 | 655 | 7,4× |
| **40 %** ← retenu | 210 | 121 | 574 | 4,8× |
| 55 % | 220 | 153 | 493 | 3,2× |

**Le seuil crée une falaise, et c'est voulu.** À 3 599 points on touche 0, à 3 600 on
touche le SMIC. Ne pas le lisser en rampe progressive : un seuil est un objectif
(« il me manque 20 minutes pour être payé ») et il fait revenir les gens en vocal.
Une rampe récompenserait le fait de rester juste en dessous.

### Revenus attendus

Ordre de grandeur sur 20 qualifiés, avec les paramètres ci-dessus :

| Profil | Vocal / sem | Paie / sem | ≈ / mois | Lecture |
|---|---:|---:|---:|---|
| Gros | 35 h | 574 | 2 485 | un temps plein |
| Régulier | 12 h | 265 | 1 148 | un temps partiel |
| Médian | ~8 h | 210 | 910 | — |
| Occasionnel | 1,5 h | 121 | 524 | argent de poche |

**Ce tableau est le garde-fou.** Toute nouvelle source de revenu doit être vérifiée
contre lui : si elle déplace ces valeurs, elle casse la grille de prix.

---

## 4. Invariants — ce qui casse en silence

Ces quatre points ne produisent aucune erreur quand on les viole. Ils produisent une
économie fausse qu'on découvre des semaines plus tard.

**1. La masse salariale s'indexe sur les qualifiés, jamais sur `users.length`.**
Les seuils de rôles, eux, se calculent bien sur toute la base — ne pas copier ce
comportement pour la paie. Un SMIC versé à tous les inscrits est un revenu universel
payé à des comptes morts.

**2. Le seuil de qualification est une protection, pas de l'avarice.**
Il empêche l'exploit suivant : `masse = nb_qualifiés × budget` indexe l'émission sur
un compteur qu'on fait monter au prix d'un seul message. Mesuré — si 200 membres
dormants envoient un message chacun dans la semaine :

| | Qualifiés | Masse émise | Paie du 1ᵉʳ |
|---|---:|---:|---:|
| Normal | 20 | 5 000 RC | 574 |
| 200 dormants × 1 message | 220 | **55 000 RC** | **4 881** |

Émission ×11 à partir de 200 messages. Et les gros joueurs en sont les premiers
bénéficiaires, donc personne n'a intérêt à le signaler. Un `@everyone` auquel 200
personnes répondent « ok » déclenche ça par accident.

**3. `scores` se lit AVANT le reset des `activityPoints`.**
Dans `ActivityRolesService.run()`, un `updateMany` remet `stats.activityPoints` à 0 et
archive la semaine dans `stats.lastWeekActivityPoints`. Le jour où quelqu'un
réorganise cette fonction, la paie verse zéro à tout le monde, sans erreur, et ça se
voit une semaine plus tard.

**4. La paie doit être idempotente.**
Si le bot redémarre au mauvais moment et que le cron repart, tout le monde est payé
deux fois. Il faut un marqueur de semaine déjà versée.

**Découpage** : ne pas mettre le versement dans `ActivityRolesService`. « Attribuer
des rôles » et « payer » sont deux raisons de changer différentes, et le CLAUDE.md
interdit le couplage entre features. Un service `payroll` appelé par le même cron,
avec `scores` en entrée.

---

## 5. Traçabilité — `flow`

Tout mouvement d'argent passe par `LogService.economy(userId, amount, reason, feature, flow)`,
directement ou via `UserService.updateUserMoney(discordId, amount, reason, flow)`.

| `flow` | Sens | Exemples |
|---|---|---|
| `mint` | création monétaire | salaire, primes de jeu, anniversaire, ajustement admin positif |
| `transfer` | joueur → joueur, somme nulle | paris arcade, mises et gains de bets |
| `burn` | destruction | achats en boutique, rake des bets, ajustement admin négatif |

Sans ce champ, la page Économie ment : un pari entre deux joueurs écrit un `-X` et un
`+X`, donc une somme naïve des montants donne ~0 et laisse croire qu'il n'y a pas
d'inflation.

`userId` accepte `null` pour un mouvement sans propriétaire (le rake d'un bet
n'appartient à personne).

---

## 6. Les primes (gains de jeux)

Les gains d'événements — bingo, avalanche, juste-prix, énigme, raids — sont des
**primes hors salaire**, plafonnées à **10–20 % d'une paie hebdomadaire médiane**,
soit **~25 à 50 RC**.

Au-delà, elles recréent l'émission incontrôlée que le salaire vient d'éliminer.

Note : les valeurs actuelles (750 par victoire) sont hors échelle d'un facteur ~20.
L'ancrage les rend visiblement absurdes — gagner 750 € en devinant un nombre casse
l'illusion immédiatement. C'est une fonctionnalité du système, pas un problème : il
signale ce qui était mal calibré.

---

## 7. Les puits — sans eux, tout le reste est temporaire

Le salaire contrôle le **débit** d'émission. Il ne détruit rien. Sans puits, la masse
monétaire croît linéairement pour toujours, à un rythme choisi mais jamais nul.

**Loue, ne vends pas.** Un objet permanent est un puits à usage unique : le joueur
riche achète le catalogue en une soirée et il n'y a plus rien à acheter. Un cosmétique
**temporaire (30 jours)** est un puits **récurrent**, qui s'aligne mécaniquement sur
le revenu récurrent.

Revenu hebdomadaire ↔ abonnements mensuels : l'argent entre le lundi et ressort en
loyers. C'est ce qui fait un circuit plutôt qu'un réservoir.

### Grille de prix indicative

Ancrée sur la médiane (210 RC / semaine, ~910 / mois) :

| Objet | Prix | Équivalent réel |
|---|---:|---|
| Consommable, achat d'impulsion | 2–5 | un café |
| Cosmétique 7 jours | 15 | une place de cinéma |
| Rôle coloré 30 jours | 40 | un abonnement |
| Pseudo custom 30 jours | 60 | un abonnement |
| Emoji perso, permanent | 300 | — |
| Prestige, permanent, unique | à calibrer | voir §9 |

---

## 8. Redénomination — la migration

Tout est divisé par 10. C'est ce qu'a fait la France en 1960 avec le nouveau franc, et
ça s'explique en une phrase : *« ton solde perd un zéro »*.

Les soldes existants sont conservés à l'identique en valeur relative — personne n'est
lésé, les rangs sont préservés.

```js
updateMany({}, [{ $set: { 'profil.money': { $round: [{ $divide: ['$profil.money', 10] }, 0] } } }])
```

Un solde de 50 000 coins devient 5 000 RC. L'arrondi absorbe au passage les soldes
fractionnaires hérités du money/minute.

Constantes à diviser par 10 dans le même passage : solde de départ (500 → 50), cadeau
d'anniversaire (100–1000 → 10–100), `baseCoins` des raids. Le daily et le money/minute
disparaissent avec le salaire.

**Faire la redénomination et l'ouverture de la boutique dans le même patchnote.**
« Nouvelle monnaie + voilà ce que vous pouvez acheter » est une annonce qui se tient ;
« on divise vos soldes par 10 » tout seul n'est qu'une mauvaise nouvelle.

---

## 9. Ce qui reste à calibrer

Les valeurs des §3 et §7 sont dérivées de **20 profils inventés**, pas de données
réelles. Elles sont cohérentes entre elles, mais elles n'ont pas encore été confrontées
au serveur. Quatre chiffres à confirmer avant de figer :

| À mesurer | Où | Pour fixer |
|---|---|---|
| Distribution des `lastWeekActivityPoints` | `users.stats` | `BUDGET_PAR_ACTIF`, `SEUIL_QUALIFICATION` |
| Messages réels par créneau de 30 min | `bot_logs` | le poids réel du texte vs vocal |
| Distribution des soldes (médiane, p90, max) | `users.profil.money` | le prix du palier prestige |
| Nombre de qualifiés par semaine | `lastWeekActivityPoints` | la masse salariale réelle |

L'hypothèse la plus fragile est la deuxième : la conversion messages → créneaux a été
posée à **6 messages par créneau**. Si les joueurs envoient en réalité 20 messages par
salve, le texte pèse trois fois moins que ce que prévoient les tableaux ci-dessus.

**Comment calibrer** : l'onglet *Paie hebdo* du dashboard rejoue le calcul sur les
`lastWeekActivityPoints` réels sans rien verser. On règle les trois paramètres, on
simule, on compare la médiane obtenue au tableau des revenus attendus (§3), et on
n'active la paie qu'une fois les valeurs jugées bonnes.

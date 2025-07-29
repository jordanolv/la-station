# 👋 Feature Welcome - Guide Complet

## 📖 Vue d'ensemble

La feature **Welcome** permet aux administrateurs de serveur de créer des messages de bienvenue et d'au revoir personnalisés pour leur communauté. Elle inclut la génération automatique d'images, l'attribution de rôles automatiques et des messages personnalisables avec placeholders.

---

## 🚀 Fonctionnalités

### ✨ **Messages de bienvenue**
- **Messages personnalisés** avec placeholders dynamiques ({user}, {username}, {guild})
- **Canal configurable** pour les messages de bienvenue
- **Génération d'images** automatique avec templates Photoshop ou fallback
- **Attribution automatique de rôles** aux nouveaux membres

### 👋 **Messages d'au revoir**
- **Messages personnalisés** pour les départs
- **Canal configurable** séparé pour les messages d'au revoir
- **Génération d'images** d'au revoir personnalisées
- **Templates visuels** différents pour bienvenue/au revoir

### 🎨 **Génération d'images**
- **Templates Photoshop** personnalisés (welcome-template.png, goodbye-template.png)
- **Images fallback** avec dégradés si pas de template
- **Avatar circulaire** avec bordure personnalisable
- **Texte adaptatif** qui se redimensionne automatiquement

### ⚙️ **Configuration flexible**
- **Activation/désactivation** globale de la feature
- **Contrôle séparé** pour bienvenue et au revoir
- **Messages personnalisables** avec validation
- **Rôles automatiques** (maximum 10)

---

## 🏗️ Architecture Technique

### 📁 Structure des fichiers
```
welcome/
├── models/
│   └── welcomeConfig.model.ts     # Modèle de configuration
├── services/
│   ├── WelcomeRepository.ts       # Accès aux données (CRUD)
│   ├── WelcomeFormatter.ts        # Formatage et validation
│   ├── WelcomeDiscordService.ts   # Interactions Discord
│   ├── WelcomeImageService.ts     # Génération d'images
│   └── welcome.service.ts         # Orchestration principale
├── routes/
│   └── welcome.route.ts           # API REST
├── events/
│   ├── guildMemberAdd.ts          # Gestionnaire arrivée
│   └── guildMemberRemove.ts       # Gestionnaire départ
└── README_WELCOME.md              # Ce guide
```

### 🔧 Services détaillés

#### **WelcomeRepository** - Accès aux données
```typescript
// CRUD simple sans logique métier
WelcomeRepository.getConfigByGuildId(guildId)
WelcomeRepository.updateConfig(guildId, config)
WelcomeRepository.createDefaultConfig(guildId)
WelcomeRepository.toggleFeature(guildId, enabled)
WelcomeRepository.updateChannels(guildId, welcomeChannelId, goodbyeChannelId)
WelcomeRepository.updateMessages(guildId, welcomeMessage, goodbyeMessage)
```

#### **WelcomeFormatter** - Transformation des données
```typescript
// Formatage et validation
WelcomeFormatter.formatMessage(template, user, guildName)
WelcomeFormatter.formatConfigForAPI(config)
WelcomeFormatter.validateMessageTemplate(template)
WelcomeFormatter.validateWelcomeConfig(config)
WelcomeFormatter.generateImageFilename(userId, type)
```

#### **WelcomeDiscordService** - Interactions Discord
```typescript
// Gestion des messages et rôles Discord
WelcomeDiscordService.sendWelcomeMessage(guild, member, config, imageBuffer)
WelcomeDiscordService.sendGoodbyeMessage(client, guildId, user, config, imageBuffer)
WelcomeDiscordService.assignAutoRoles(member, roleIds)
WelcomeDiscordService.validateChannel(guild, channelId)
WelcomeDiscordService.validateRoles(guild, roleIds)
```

#### **WelcomeImageService** - Génération d'images
```typescript
// Création d'images avec Canvas
WelcomeImageService.generateWelcomeImage(user, guildName)
WelcomeImageService.generateGoodbyeImage(user, guildName)
WelcomeImageService.templateExists(templatePath)
WelcomeImageService.generateTestImage(type)
```

---

## 📊 Modèle de données

### **WelcomeConfig**
```typescript
{
  enabled: boolean;                    // Feature activée
  welcomeEnabled: boolean;             // Messages de bienvenue activés
  goodbyeEnabled: boolean;             // Messages d'au revoir activés
  welcomeChannelId: string | null;     // Canal pour bienvenue
  goodbyeChannelId: string | null;     // Canal pour au revoir
  welcomeMessage: string;              // Template message bienvenue
  goodbyeMessage: string;              // Template message au revoir
  generateWelcomeImage: boolean;       // Génération image bienvenue
  generateGoodbyeImage: boolean;       // Génération image au revoir
  autoRoles: string[];                 // Rôles automatiques (max 10)
}
```

### **Placeholders supportés**
- `{user}` - Mention de l'utilisateur (<@123456789>)
- `{username}` - Nom d'utilisateur (JohnDoe)
- `{displayName}` - Nom d'affichage du serveur
- `{tag}` - Tag complet (JohnDoe#1234)
- `{guild}` - Nom du serveur

---

## 🔄 Cycle de vie d'un événement

### 1. **Arrivée d'un membre**
```typescript
// Discord Event → Handler → Service
await WelcomeService.handleMemberJoin(member);
```
**Actions automatiques :**
- ✅ Vérification de la configuration
- ✅ Attribution des rôles automatiques
- ✅ Génération d'image (si activée)
- ✅ Envoi du message de bienvenue
- ✅ Logging détaillé

### 2. **Départ d'un membre**
```typescript
// Discord Event → Handler → Service
await WelcomeService.handleMemberLeave(client, guildId, user);
```
**Actions automatiques :**
- ✅ Vérification de la configuration
- ✅ Génération d'image d'au revoir (si activée)
- ✅ Envoi du message d'au revoir
- ✅ Logging détaillé

---

## 🌐 API REST

### **Endpoints principaux**

#### **GET** `/api/guilds/{guildId}/features/welcome/settings`
Récupère la configuration Welcome
```json
{
  "settings": {
    "enabled": true,
    "welcomeEnabled": true,
    "goodbyeEnabled": false,
    "welcomeChannelId": "123456789",
    "goodbyeChannelId": null,
    "welcomeMessage": "Bienvenue {user} sur {guild}!",
    "goodbyeMessage": "Au revoir {user}!",
    "generateWelcomeImage": true,
    "generateGoodbyeImage": false,
    "autoRoles": ["987654321"]
  },
  "templateInfo": {
    "welcome": true,
    "goodbye": false
  }
}
```

#### **PUT** `/api/guilds/{guildId}/features/welcome/settings`
Met à jour la configuration complète
```json
{
  "enabled": true,
  "welcomeEnabled": true,
  "welcomeMessage": "Salut {user} ! Bienvenue sur {guild} !",
  "generateWelcomeImage": true,
  "autoRoles": ["123456789", "987654321"]
}
```

#### **POST** `/api/guilds/{guildId}/features/welcome/toggle`
Active/désactive la feature
```json
{
  "enabled": true
}
```

#### **POST** `/api/guilds/{guildId}/features/welcome/messages`
Met à jour les messages et leur statut
```json
{
  "welcomeEnabled": true,
  "goodbyeEnabled": false,
  "welcomeMessage": "Nouveau message de bienvenue avec {user}",
  "goodbyeMessage": "Message d'au revoir pour {user}"
}
```

#### **POST** `/api/guilds/{guildId}/features/welcome/channels`
Configure les canaux
```json
{
  "welcomeChannelId": "123456789",
  "goodbyeChannelId": "987654321"
}
```

#### **POST** `/api/guilds/{guildId}/features/welcome/auto-roles`
Met à jour les rôles automatiques
```json
{
  "roleIds": ["123456789", "987654321"]
}
```

#### **POST** `/api/guilds/{guildId}/features/welcome/images`
Configure la génération d'images
```json
{
  "generateWelcomeImage": true,
  "generateGoodbyeImage": false
}
```

#### **GET** `/api/guilds/{guildId}/features/welcome/test`
Teste la configuration actuelle
```json
{
  "success": true,
  "errors": []
}
```

#### **GET** `/api/guilds/{guildId}/features/welcome/test-image/{type}`
Génère une image de test (type: "welcome" ou "goodbye")
- Retourne directement l'image PNG

---

## 🎮 Utilisation Discord

### **Pour les administrateurs**
1. **Configurer la feature** via l'interface web
2. **Définir les canaux** pour bienvenue et au revoir
3. **Personnaliser les messages** avec placeholders
4. **Configurer les rôles automatiques**
5. **Activer la génération d'images** si désiré
6. **Tester la configuration** avant activation

### **Pour les nouveaux membres**
1. **Arrivée automatique** détectée par le bot
2. **Réception des rôles** automatiques configurés
3. **Message de bienvenue** dans le canal désigné
4. **Image personnalisée** (si activée)

---

## ⚙️ Configuration

### **Prérequis**
- **Canaux Discord** accessibles par le bot
- **Permissions bot** : Gérer les rôles, Envoyer des messages, Joindre des fichiers
- **Templates d'images** (optionnel) dans `src/templates/`

### **Templates d'images personnalisés**
Placez vos templates Photoshop dans :
- `src/templates/welcome-template.png` (800x300px)
- `src/templates/goodbye-template.png` (800x300px)

### **Configuration par guilde**
Via l'interface web `/server/{guildId}/features/welcome` :
- ✅ **Activer/désactiver** la feature
- ✅ **Sélectionner les canaux** pour bienvenue/au revoir
- ✅ **Personnaliser les messages** avec aperçu
- ✅ **Configurer les rôles** automatiques
- ✅ **Activer la génération d'images**

---

## 🔧 Développement

### **Ajouter une nouvelle fonctionnalité**
1. **Modèle** : Modifier `welcomeConfig.model.ts` si besoin
2. **Repository** : Ajouter méthodes CRUD dans `WelcomeRepository.ts`
3. **Service** : Logique métier dans le service approprié
4. **API** : Nouvelle route dans `welcome.route.ts`
5. **Frontend** : Interface dans le composant Vue

### **Tests recommandés**
```typescript
// Test Repository
describe('WelcomeRepository', () => {
  it('should create default config', async () => {
    const config = await WelcomeRepository.createDefaultConfig('123456789');
    expect(config.enabled).toBe(false);
  });
});

// Test Formatter
describe('WelcomeFormatter', () => {
  it('should format message with placeholders', () => {
    const message = WelcomeFormatter.formatMessage('Hello {user}!', mockUser);
    expect(message).toContain('<@');
  });
});

// Test Image Service
describe('WelcomeImageService', () => {
  it('should generate welcome image', async () => {
    const buffer = await WelcomeImageService.generateWelcomeImage(mockUser, 'Test Guild');
    expect(buffer).toBeInstanceOf(Buffer);
  });
});
```

---

## 🐛 Dépannage

### **Problèmes fréquents**

#### **Les messages ne s'affichent pas**
- ✅ Vérifier que la **feature est activée**
- ✅ Vérifier que les **messages sont activés** (welcomeEnabled/goodbyeEnabled)
- ✅ Vérifier que les **canaux existent** et sont accessibles
- ✅ Vérifier les **permissions du bot**

#### **Les rôles automatiques ne fonctionnent pas**
- ✅ Vérifier que les **rôles existent** dans le serveur
- ✅ Vérifier que le **bot a la permission** de gérer les rôles
- ✅ Vérifier que les **rôles du bot** sont plus hauts dans la hiérarchie
- ✅ Maximum **10 rôles automatiques** autorisés

#### **La génération d'images échoue**
- ✅ Vérifier que **Canvas** est installé correctement
- ✅ Vérifier les **templates** dans `src/templates/`
- ✅ Vérifier les **logs de la console** pour les erreurs détaillées
- ✅ Tester avec l'endpoint `/test-image`

#### **Messages avec placeholders incorrects**
- ✅ Utiliser les **placeholders valides** : {user}, {username}, {displayName}, {tag}, {guild}
- ✅ Respecter la **limite de 2000 caractères**
- ✅ Tester avec l'endpoint `/test`

#### **Erreurs de configuration**
- ✅ Vérifier les **IDs de canaux** et **rôles**
- ✅ Utiliser l'endpoint `/test` pour **diagnostiquer**
- ✅ Vérifier les **logs du serveur** pour les détails

---

## 📈 Monitoring & Logs

La feature Welcome génère des logs détaillés :
- **Arrivées/départs** de membres
- **Attribution de rôles** automatiques
- **Envoi de messages** et images
- **Erreurs de configuration** et permissions
- **Validation des templates** et images

Format des logs :
```
[WELCOME] Message de bienvenue envoyé pour JohnDoe#1234 (John Doe) [123456789] dans Mon Serveur
[WELCOME] Rôles automatiques attribués à JohnDoe#1234: Membre, Nouveau
[WELCOME] Erreur lors de la génération d'image: Template non trouvé
```

---

**💡 La feature Welcome est conçue pour être robuste et extensible. Chaque service a une responsabilité claire, facilitant la maintenance et l'ajout de nouvelles fonctionnalités !**
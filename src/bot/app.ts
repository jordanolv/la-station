import { Client, GatewayIntentBits, Collection } from 'discord.js';
import path from 'path';
import { connectToDatabase } from './handlers/mongoose';
import { loadFeatures } from './handlers/feature';

// Création du client Discord avec les intents nécessaires
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Définition des collections pour stocker commandes et slash commands
client.commands = new Collection();
client.slashCommands = new Collection();

// Fonction principale pour démarrer le bot
async function main() {
  console.log('Démarrage du bot...');
  
  // Connexion à la base de données MongoDB
  await connectToDatabase();
  
  // Chargement des fonctionnalités
  const featuresPath = path.join(__dirname, 'features');
  await loadFeatures(client, featuresPath);
  
  // Connexion à Discord
  try {
    await client.login(process.env.DISCORD_TOKEN);
    console.log('Bot connecté avec succès!');
  } catch (error) {
    console.error('Erreur lors de la connexion à Discord:', error);
    process.exit(1);
  }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('Erreur non gérée:', error);
});

// Démarrage du bot
main();

// Ajout des types pour TypeScript
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
    slashCommands: Collection<string, any>;
  }
}

export { client };
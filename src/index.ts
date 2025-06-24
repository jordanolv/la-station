import { startBot } from './bot/start';
import { startApiServer } from './api/start';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Vérifier que les variables d'environnement sont chargées
console.log('======= VÉRIFICATION DES VARIABLES D\'ENVIRONNEMENT =======');
console.log(`DISCORD_CLIENT_ID: ${process.env.DISCORD_CLIENT_ID ? '✅ Défini' : '❌ Non défini'}`);
console.log(`DISCORD_CLIENT_SECRET: ${process.env.DISCORD_CLIENT_SECRET ? '✅ Défini' : '❌ Non défini'}`);
console.log(`DISCORD_REDIRECT_URI: ${process.env.DISCORD_REDIRECT_URI ? '✅ Défini' : '❌ Non défini'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Défini' : '❌ Non défini'}`);
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL ? '✅ Défini' : '❌ Non défini'}`);
console.log('=========================================================');

async function main() {
  try {
    console.log('Starting La Station...');

    // Démarrer le bot Discord d'abord
    const botClient = await startBot();

    // Puis démarrer le serveur API
    const API_PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 3051;
    startApiServer(API_PORT);

    console.log('La Station is running!');

    // Gérer l'arrêt propre
    process.on('SIGINT', async () => {
      console.log('Shutting down...');

      if (botClient) {
        botClient.destroy();
        console.log('Bot disconnected');
      }

      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start La Station:', error);
    process.exit(1);
  }
}

main();
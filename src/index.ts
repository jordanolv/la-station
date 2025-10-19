import { startBot } from './bot/start';
import { startApiServer } from './api/start';
import { initializeCanvas } from './shared/canvas-init';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

async function main() {
  try {
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.cyan.bold('          🚀 DÉMARRAGE DE LA STATION'));
    console.log(chalk.cyan('═'.repeat(60)));

    // Initialiser le canvas (nécessaire pour @napi-rs/canvas)
    initializeCanvas();

    const botClient = await startBot();
    const API_PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 3051;
    startApiServer(API_PORT);

    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.green.bold('          ✅ LA STATION EST EN LIGNE'));
    console.log(chalk.cyan('═'.repeat(60)));

    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n⚠️  Arrêt en cours...'));
      if (botClient) {
        botClient.destroy();
        console.log(chalk.gray('   Bot déconnecté'));
      }
      process.exit(0);
    });
  } catch (error) {
    console.error(chalk.red.bold('❌ Erreur fatale:'), error);
    process.exit(1);
  }
}

main();
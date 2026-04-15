import { startBot } from './bot/start';
import { startWebServer } from './web/server';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

async function main() {
  try {
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.cyan.bold('          🚀 DÉMARRAGE DE RIDGY'));
    console.log(chalk.cyan('═'.repeat(60)));

    const botClient = await startBot();
    startWebServer();

    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.green.bold('          ✅ THE RIDGE EST EN LIGNE'));
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

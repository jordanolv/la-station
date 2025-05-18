// main.ts
import { config } from 'dotenv';
import { BotClient } from './BotClient';
import { connectToDatabase } from './handlers/mongoose';
import { loadFeatures } from './handlers/feature';
import path from 'path';
import { REST, Routes } from 'discord.js';
import { createAPI } from '../api';
import { CronManager } from './cron';
import { serve } from '@hono/node-server';
import chalk from 'chalk';

// Charger les variables d'environnement
const envPath = path.resolve(__dirname, '../../.env');
config({ path: envPath });

(async () => {
  // 1) Initialiser la classe
  console.log(chalk.blue.bold('🚀 Initialisation du bot La Station...'));
  const client = await BotClient.init();

  // 2) Connexion à MongoDB
  await connectToDatabase(process.env.MONGODB_URI);
  console.log(chalk.green('✅ Connexion à MongoDB réussie !'));

  // 4) Initialiser l'API
  const api = createAPI(client);
  serve({
    fetch: api.fetch,
    port: 3002
  }, (info) => {
    console.log(chalk.magentaBright(`🌐 API démarrée sur ${chalk.underline(`http://localhost:${info.port}`)}`));
  });

  // 3) Charger les fonctionnalités
  const featuresPath = path.join(__dirname, 'features');
  await loadFeatures(client, featuresPath);

  // 5) Initialiser tous les crons
  const cronManager = new CronManager(client);
  cronManager.startAll();
  console.log(chalk.yellow('⏰ Cron jobs démarrés !'));

  // 6) Connexion à Discord
  try {
    const token = process.env.DISCORD_TOKEN;
    if (!token) throw new Error("DISCORD_TOKEN n'est pas défini dans l'environnement");

    await client.login(token);

    // 7) Auto-déploiement des slash commands (optionnel)
    if (process.env.AUTO_DEPLOY_COMMANDS === 'true') {
      const slashCommands = Array.from(client.slashCommands.values());
      if (slashCommands.length > 0) {
        console.log(`Déploiement de ${slashCommands.length} slash commands...`);
        const rest = new REST({ version: '10' }).setToken(token);

        // Supprimer toutes les commandes existantes
        try {
          if (process.env.GUILD_ID) {
            await rest.put(
              Routes.applicationGuildCommands(client.user?.id || '', process.env.GUILD_ID),
              { body: [] }
            );
            console.log(chalk.red("Anciennes commandes supprimées pour la guild !"));
          } else {
            await rest.put(
              Routes.applicationCommands(client.user?.id || ''),
              { body: [] }
            );
            console.log("Anciennes commandes supprimées globalement !");
          }
        } catch (error) {
          console.error("Erreur lors de la suppression des anciennes commandes:", error);
        }

        // Déployer les nouvelles commandes
        const commandsData = slashCommands.map(cmd => cmd.data.toJSON());

        if (process.env.GUILD_ID) {
          await rest.put(
            Routes.applicationGuildCommands(client.user?.id || '', process.env.GUILD_ID),
            { body: commandsData }
          );
          console.log("Commandes Slash déployées pour la guild !");
        } else {
          await rest.put(
            Routes.applicationCommands(client.user?.id || ''),
            { body: commandsData }
          );
          console.log("Commandes Slash déployées globalement !");
        }
        console.log('Slash commands enregistrées avec succès!');
      } else {
        console.log("Aucune slash command à déployer.");
      }
    }
  } catch (error) {
    console.error('Erreur lors de la connexion à Discord:', error);
    process.exit(1);
  }
})();

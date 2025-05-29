import { config } from 'dotenv';
import { BotClient } from './client';
import { connectToDatabase } from '../shared/db';
import { loadFeatures } from './handlers/feature';
import { loadEvents } from './handlers/event';
import path from 'path';
import { REST, Routes } from 'discord.js';
import chalk from 'chalk';
import fs from 'fs';
import { CronManager } from './cron';

export async function startBot() {
  try {
    // Charger les variables d'environnement
    const envPath = path.resolve(__dirname, '../../.env');
    console.log(chalk.yellow(`Tentative de chargement du fichier .env depuis: ${envPath}`));

    // Vérifier si le fichier existe
    if (fs.existsSync(envPath)) {
      console.log(chalk.green(`✅ Fichier .env trouvé à ${envPath}`));
      config({ path: envPath });
      
      // Vérifier si les variables critiques sont chargées
      console.log(chalk.yellow('Variables d\'environnement critiques:'));
      console.log(chalk.yellow(`- DISCORD_CLIENT_ID: ${process.env.DISCORD_CLIENT_ID ? '✅' : '❌'}`));
      console.log(chalk.yellow(`- DISCORD_REDIRECT_URI: ${process.env.DISCORD_REDIRECT_URI ? '✅' : '❌'}`));
      console.log(chalk.yellow(`- FRONTEND_URL: ${process.env.FRONTEND_URL ? '✅' : '❌'}`));
      console.log(chalk.yellow(`- VITE_API_BASE_URL: ${process.env.VITE_API_BASE_URL ? '✅' : '❌'}`));
    } else {
      console.log(chalk.red(`❌ Fichier .env NON TROUVÉ à ${envPath}`));
    }

    // 1) Initialiser la classe
    console.log(chalk.blue.bold('🚀 Initialisation du bot La Station...'));
    const client = await BotClient.init();

    // 2) Connexion à MongoDB
    await connectToDatabase();
    console.log(chalk.green('✅ Connexion à MongoDB réussie !'));

    // 3) Charger les événements globaux
    const eventsPath = path.join(__dirname, 'events');
    await loadEvents(client, eventsPath);
    console.log(chalk.cyan('📊 Événements globaux chargés !'));

    // 4) Charger les fonctionnalités
    const featuresPath = path.join(__dirname, '../features');
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
      throw error;
    }

    return client;
  } catch (error) {
    console.error('Erreur lors du démarrage du bot:', error);
    throw error;
  }
} 
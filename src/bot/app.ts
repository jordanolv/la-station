// main.ts
import { config } from 'dotenv';
import { BotClient } from './BotClient';
import { connectToDatabase } from './handlers/mongoose';
import { loadFeatures } from './handlers/feature';
import path from 'path';
import { REST, Routes } from 'discord.js';
import { createAPI } from '../api';
import * as Sentry from "@sentry/node";
import { CronManager } from './cron';
import { serve } from '@hono/node-server'

// Charger les variables d'environnement
const envPath = path.resolve(__dirname, '../../.env');
config({ path: envPath });


(async () => {
  // 1) Initialiser la classe
  const client = await BotClient.init();

  Sentry.init({
    dsn: "https://3b5f8501b836288693676cb2b6be83c2@o4509106646351872.ingest.de.sentry.io/4509106650153040",
    tracesSampleRate: 1.0, // ajuste à 0.1 si tu veux moins de traces
  });

  process.on("unhandledRejection", (reason: any) => {
    console.error("Unhandled Rejection:", reason);
    Sentry.captureException(reason);
  });
  
  process.on("uncaughtException", (error: Error) => {
    console.error("Uncaught Exception:", error);
    Sentry.captureException(error);
  });
  

  // 2) Connexion à MongoDB
  await connectToDatabase();

  // 3) Charger les fonctionnalités
  const featuresPath = path.join(__dirname, 'features');
  await loadFeatures(client, featuresPath);

  // 4) Initialiser l'API
  const api = createAPI(client);
  serve({
    fetch: api.fetch,
    port: 3002
  }, (info) => {
    console.log(`API démarrée sur http://localhost:${info.port}`)
  })


  // 5) Initialiser tous les crons
  const cronManager = new CronManager(client);
  cronManager.startAll();

  console.log(process.env.DISCORD_CLIENT_ID)
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
            console.log("Anciennes commandes supprimées pour la guild !");
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

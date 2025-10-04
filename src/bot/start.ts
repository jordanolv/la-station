import { config } from 'dotenv';
import { BotClient } from './client';
import { connectToDatabase } from '../shared/db';
import { loadFeatures } from './handlers/feature';
import { loadEvents } from './handlers/event';
import path from 'path';
import { REST, Routes } from 'discord.js';
import chalk from 'chalk';
import fs from 'fs';
import { CronManager } from '../shared/cron/cron-manager';

export async function startBot() {
  try {
    // Ne pas recharger dotenv ici car déjà chargé dans index.ts
    console.log(chalk.blueBright('🤖 [BOT]') + chalk.gray(' Initialisation...'));
    const client = await BotClient.init();

    console.log(chalk.greenBright('💾 [DB]') + chalk.gray(' Connexion...'));
    await connectToDatabase();
    console.log(chalk.greenBright('💾 [DB]') + chalk.green(' Connecté'));

    const eventsPath = path.join(__dirname, 'events');
    await loadEvents(client, eventsPath);

    const featuresPath = path.join(__dirname, '../features');
    await loadFeatures(client, featuresPath);

    const token = process.env.DISCORD_TOKEN;
    if (!token) throw new Error("DISCORD_TOKEN manquant");

    // Déployer les commandes AVANT de se connecter à Discord
    if (process.env.AUTO_DEPLOY_COMMANDS === 'true') {
      const slashCommands = Array.from(client.slashCommands.values());
      if (slashCommands.length > 0) {
        const rest = new REST({ version: '10' }).setToken(token);
        const commandsData = slashCommands.map(cmd => cmd.data.toJSON());

        if (process.env.GUILD_ID) {
          await rest.put(
            Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID || '', process.env.GUILD_ID),
            { body: commandsData }
          );
        } else {
          await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID || ''),
            { body: commandsData }
          );
        }
      }
    }

    console.log(chalk.yellow('⏰ [CRON]') + chalk.gray(' Démarrage...'));
    const cronManager = new CronManager(client);
    cronManager.startAll();

    await client.login(token);

    return client;
  } catch (error) {
    console.error(chalk.red('❌ [BOT]'), error);
    throw error;
  }
} 
import path from 'path';
import fs from 'fs';
import { BotClient } from '../client';

/**
 * Charge toutes les fonctionnalités du bot
 * @param botClient Le client Discord personnalisé (BotClient)
 * @param featuresPath Le chemin vers le dossier des fonctionnalités
 */
export async function loadFeatures(botClient: BotClient, featuresPath: string): Promise<void> {
  try {
    const chalk = require('chalk');
    const features = fs.readdirSync(featuresPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(chalk.cyan('📦 [FEATURES]') + chalk.gray(` Chargement de ${features.length} modules...`));

    let totalCommands = 0;
    let totalSlash = 0;
    let totalEvents = 0;

    // Charger toutes les features en parallèle pour gagner du temps
    const featurePromises = features.map(async (feature) => {
      const featurePath = path.join(featuresPath, feature);

      // Charger commands, slash et events en parallèle pour chaque feature
      const [commands, slash, events] = await Promise.all([
        loadCommands(botClient, featurePath, feature),
        loadSlashCommands(botClient, featurePath, feature),
        loadEvents(botClient, featurePath, feature)
      ]);

      return { feature, commands, slash, events };
    });

    const results = await Promise.all(featurePromises);

    // Afficher les résultats
    for (const { feature, commands, slash, events } of results) {
      totalCommands += commands;
      totalSlash += slash;
      totalEvents += events;

      if (slash > 0 || events > 0 || commands > 0) {
        const parts = [];
        if (slash > 0) parts.push(`${slash} slash`);
        if (events > 0) parts.push(`${events} events`);
        if (commands > 0) parts.push(`${commands} cmds`);
        console.log(chalk.cyan('   ├─') + chalk.gray(` ${feature}: ${parts.join(', ')}`));
      }
    }

    console.log(chalk.cyan('   └─') + chalk.green(` Total: ${totalSlash} slash • ${totalEvents} events • ${totalCommands} cmds`));
  } catch (error) {
    const chalk = require('chalk');
    console.error(chalk.red('❌ [FEATURES]'), error);
  }
}

/**
 * Charge les commandes d'une fonctionnalité
 */
async function loadCommands(botClient: BotClient, featurePath: string, featureName: string): Promise<number> {
  const commandsPath = path.join(featurePath, 'commands');

  if (!fs.existsSync(commandsPath)) {
    return 0;
  }

  const commandFiles = getFilesRecursively(commandsPath, ['.ts', '.js']);

  // Charger tous les fichiers en parallèle
  const results = await Promise.allSettled(
    commandFiles.map(async (filePath) => {
      try {
        const command = require(filePath).default;
        if (command && command.name) {
          botClient.commands.set(command.name.toLowerCase(), command);
          return true;
        }
        return false;
      } catch (error) {
        const chalk = require('chalk');
        console.error(chalk.red(`❌ [${featureName}]`), path.basename(filePath), error);
        return false;
      }
    })
  );

  return results.filter(r => r.status === 'fulfilled' && r.value).length;
}

/**
 * Charge les slash commands d'une fonctionnalité
 */
async function loadSlashCommands(botClient: BotClient, featurePath: string, featureName: string): Promise<number> {
  const slashPath = path.join(featurePath, 'slash');

  if (!fs.existsSync(slashPath)) {
    return 0;
  }

  const slashFiles = getFilesRecursively(slashPath, ['.ts', '.js']);

  // Charger tous les fichiers en parallèle
  const results = await Promise.allSettled(
    slashFiles.map(async (filePath) => {
      try {
        const slashCommand = require(filePath).default;
        if (slashCommand && slashCommand.data) {
          botClient.slashCommands.set(slashCommand.data.name.toLowerCase(), slashCommand);
          return true;
        }
        return false;
      } catch (error) {
        const chalk = require('chalk');
        console.error(chalk.red(`❌ [${featureName}]`), path.basename(filePath), error);
        return false;
      }
    })
  );

  return results.filter(r => r.status === 'fulfilled' && r.value).length;
}

/**
 * Charge les événements d'une fonctionnalité
 */
async function loadEvents(botClient: BotClient, featurePath: string, featureName: string): Promise<number> {
  const eventsPath = path.join(featurePath, 'events');

  if (!fs.existsSync(eventsPath)) {
    return 0;
  }

  const eventFiles = getFilesRecursively(eventsPath, ['.ts', '.js']);

  // Charger tous les fichiers en parallèle
  const results = await Promise.allSettled(
    eventFiles.map(async (filePath) => {
      try {
        const event = require(filePath).default;
        if (event && event.name && event.execute) {
          if (event.once) {
            botClient.once(event.name, (...args) => event.execute(botClient, ...args));
          } else {
            botClient.on(event.name, (...args) => event.execute(botClient, ...args));
          }
          return true;
        }
        return false;
      } catch (error) {
        const chalk = require('chalk');
        console.error(chalk.red(`❌ [${featureName}]`), path.basename(filePath), error);
        return false;
      }
    })
  );

  return results.filter(r => r.status === 'fulfilled' && r.value).length;
}

/**
 * Récupère tous les fichiers de manière récursive dans un dossier
 */
function getFilesRecursively(dir: string, extensions: string[]): string[] {
  let files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    
    if (dirent.isDirectory()) {
      files = [...files, ...getFilesRecursively(res, extensions)];
    } else if (extensions.some(ext => res.endsWith(ext))) {
      files.push(res);
    }
  }
  
  return files;
}

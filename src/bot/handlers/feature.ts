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

    for (const feature of features) {
      const featurePath = path.join(featuresPath, feature);
      const counts = {
        commands: await loadCommands(botClient, featurePath, feature),
        slash: await loadSlashCommands(botClient, featurePath, feature),
        events: await loadEvents(botClient, featurePath, feature)
      };

      totalCommands += counts.commands;
      totalSlash += counts.slash;
      totalEvents += counts.events;

      // Afficher une ligne par feature si elle a du contenu
      if (counts.slash > 0 || counts.events > 0 || counts.commands > 0) {
        const parts = [];
        if (counts.slash > 0) parts.push(`${counts.slash} slash`);
        if (counts.events > 0) parts.push(`${counts.events} events`);
        if (counts.commands > 0) parts.push(`${counts.commands} cmds`);
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
  let count = 0;

  for (const filePath of commandFiles) {
    try {
      const command = require(filePath).default;
      if (command && command.name) {
        botClient.commands.set(command.name.toLowerCase(), command);
        count++;
      }
    } catch (error) {
      const chalk = require('chalk');
      console.error(chalk.red(`❌ [${featureName}]`), path.basename(filePath), error);
    }
  }

  return count;
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
  let count = 0;

  for (const filePath of slashFiles) {
    try {
      const slashCommand = require(filePath).default;
      if (slashCommand && slashCommand.data) {
        botClient.slashCommands.set(slashCommand.data.name.toLowerCase(), slashCommand);
        count++;
      }
    } catch (error) {
      const chalk = require('chalk');
      console.error(chalk.red(`❌ [${featureName}]`), path.basename(filePath), error);
    }
  }

  return count;
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
  let count = 0;

  for (const filePath of eventFiles) {
    try {
      const event = require(filePath).default;
      if (event && event.name && event.execute) {
        if (event.once) {
          botClient.once(event.name, (...args) => event.execute(botClient, ...args));
        } else {
          botClient.on(event.name, (...args) => event.execute(botClient, ...args));
        }
        count++;
      }
    } catch (error) {
      const chalk = require('chalk');
      console.error(chalk.red(`❌ [${featureName}]`), path.basename(filePath), error);
    }
  }

  return count;
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

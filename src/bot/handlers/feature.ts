import { Client } from 'discord.js';
import fs from 'fs';
import path from 'path';

/**
 * Charge toutes les fonctionnalités du bot
 * @param client Le client Discord
 * @param featuresPath Le chemin vers le dossier des fonctionnalités
 */
export async function loadFeatures(client: Client, featuresPath: string): Promise<void> {
  try {
    // Lecture du dossier des fonctionnalités
    const features = fs.readdirSync(featuresPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`Chargement de ${features.length} fonctionnalités...`);
    
    for (const feature of features) {
      const featurePath = path.join(featuresPath, feature);
      console.log(`Chargement de la fonctionnalité: ${feature}`);
      
      // Chargement des commandes
      await loadCommands(client, featurePath, feature);
      
      // Chargement des slash commands
      await loadSlashCommands(client, featurePath, feature);
      
      // Chargement des événements
      await loadEvents(client, featurePath, feature);
    }
    
    console.log('Toutes les fonctionnalités ont été chargées!');
  } catch (error) {
    console.error('Erreur lors du chargement des fonctionnalités:', error);
  }
}

/**
 * Charge les commandes d'une fonctionnalité
 */
async function loadCommands(client: Client, featurePath: string, featureName: string): Promise<void> {
  const commandsPath = path.join(featurePath, 'commands');
  
  if (!fs.existsSync(commandsPath)) {
    return; // Pas de dossier commands, on passe
  }
  
  // Lecture récursive des commandes dans les sous-dossiers
  const commandFiles = getFilesRecursively(commandsPath, '.ts');
  
  for (const filePath of commandFiles) {
    try {
      const command = require(filePath).default;
      
      if (command && command.name) {
        client.commands.set(command.name, command);
        console.log(`Commande chargée: ${command.name} (${featureName})`);
      }
    } catch (error) {
      console.error(`Erreur lors du chargement de la commande ${filePath}:`, error);
    }
  }
}

/**
 * Charge les slash commands d'une fonctionnalité
 */
async function loadSlashCommands(client: Client, featurePath: string, featureName: string): Promise<void> {
  const slashPath = path.join(featurePath, 'slash');
  
  if (!fs.existsSync(slashPath)) {
    return; // Pas de dossier slash, on passe
  }
  
  const slashFiles = getFilesRecursively(slashPath, '.ts');
  
  for (const filePath of slashFiles) {
    try {
      const slashCommand = require(filePath).default;
      
      if (slashCommand && slashCommand.data) {
        client.slashCommands.set(slashCommand.data.name, slashCommand);
        console.log(`Slash command chargée: ${slashCommand.data.name} (${featureName})`);
      }
    } catch (error) {
      console.error(`Erreur lors du chargement de la slash command ${filePath}:`, error);
    }
  }
}

/**
 * Charge les événements d'une fonctionnalité
 */
async function loadEvents(client: Client, featurePath: string, featureName: string): Promise<void> {
  const eventsPath = path.join(featurePath, 'events');
  
  if (!fs.existsSync(eventsPath)) {
    return; // Pas de dossier events, on passe
  }
  
  const eventFiles = getFilesRecursively(eventsPath, '.ts');
  
  for (const filePath of eventFiles) {
    try {
      const event = require(filePath).default;
      
      if (event && event.name && event.execute) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(client, ...args));
        } else {
          client.on(event.name, (...args) => event.execute(client, ...args));
        }
        console.log(`Événement chargé: ${event.name} (${featureName})`);
      }
    } catch (error) {
      console.error(`Erreur lors du chargement de l'événement ${filePath}:`, error);
    }
  }
}

/**
 * Récupère tous les fichiers de manière récursive dans un dossier
 */
function getFilesRecursively(dir: string, extension: string): string[] {
  let files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    
    if (dirent.isDirectory()) {
      files = [...files, ...getFilesRecursively(res, extension)];
    } else if (res.endsWith(extension)) {
      files.push(res);
    }
  }
  
  return files;
}
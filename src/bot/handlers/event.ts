import path from 'path';
import fs from 'fs';
import { BotClient } from '../client';

/**
 * Charge tous les événements globaux du bot
 * @param botClient Le client Discord personnalisé (BotClient)
 * @param eventsPath Le chemin vers le dossier des événements
 */
export async function loadEvents(botClient: BotClient, eventsPath: string): Promise<void> {
  try {
    if (!fs.existsSync(eventsPath)) {
      console.log(`Le dossier des événements ${eventsPath} n'existe pas.`);
      return;
    }
    
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    console.log(`Chargement de ${eventFiles.length} événements globaux...`);
    
    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      
      try {
        const event = require(filePath).default;
        
        if (!event || !event.name || !event.execute) {
          console.error(`L'événement ${file} ne contient pas les propriétés requises (name, execute).`);
          continue;
        }
        
        if (event.once) {
          botClient.once(event.name, (...args) => event.execute(botClient, ...args));
        } else {
          botClient.on(event.name, (...args) => event.execute(botClient, ...args));
        }
        
        console.log(`✅ Événement global chargé: ${event.name}`);
      } catch (error) {
        console.error(`Erreur lors du chargement de l'événement ${file}:`, error);
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement des événements globaux:', error);
  }
} 
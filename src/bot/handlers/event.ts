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
      return;
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
    let count = 0;

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);

      try {
        const event = require(filePath).default;

        if (!event || !event.name || !event.execute) {
          continue;
        }

        if (event.once) {
          botClient.once(event.name, (...args) => event.execute(botClient, ...args));
        } else {
          botClient.on(event.name, (...args) => event.execute(botClient, ...args));
        }

        count++;
      } catch (error) {
        const chalk = require('chalk');
        console.error(chalk.red(`❌ [EVENT]`), file, error);
      }
    }

    if (count > 0) {
      const chalk = require('chalk');
      console.log(chalk.cyan('📡 [EVENTS]') + chalk.green(` ${count} chargé(s)`));
    }
  } catch (error) {
    const chalk = require('chalk');
    console.error(chalk.red('❌ [EVENTS]'), error);
  }
} 
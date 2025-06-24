import { Events } from 'discord.js';
import { BotClient } from '../../../bot/client';

export default {
  name: Events.ClientReady,
  once: true,

  execute(client: BotClient) {
    console.log(`✅ Feature Admin chargée avec succès!`);
    console.log(`🔍 La feature Admin contient les commandes set-channel-logs, set-channel-birthday, etc.`);
  }
}; 
import { Events } from 'discord.js';
import { BotClient } from '../../../bot/client';

export default {
  name: Events.ClientReady,
  once: true,

  execute(client: BotClient) {
    // Feature ready - logs supprimés pour éviter le spam
  }
}; 

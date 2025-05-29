import { Events } from 'discord.js';
import { BotClient } from '../client';

export default {
  name: Events.ClientReady,
  once: true,
  
  /**
   * Gère l'événement ready du bot
   * @param client Le client Discord
   */
  async execute(client: BotClient) {
    console.log(`Bot prêt! Connecté en tant que ${client.user?.tag}`);
  }
};
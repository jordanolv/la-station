import { Client, REST, Routes } from 'discord.js';
import { BotClient } from '../../../BotClient';

export default {
  name: 'ready',
  once: true,
  
  /**
   * Gère l'événement ready du bot
   * @param client Le client Discord
   */
  async execute(client: BotClient) {
    console.log(`Bot prêt! Connecté en tant que ${client.user?.tag}`);
  }
};
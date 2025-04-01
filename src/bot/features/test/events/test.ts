import { Client, REST, Routes } from 'discord.js';

export default {
  name: 'test',
  once: false,
  
  /**
   * Gère l'événement ready du bot
   * @param client Le client Discord
   */
  async execute(client: Client) {
    console.log(`test ${client.user?.tag}`);
  }
};
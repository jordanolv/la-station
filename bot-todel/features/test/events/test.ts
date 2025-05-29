import { BotClient } from '../../../BotClient';

export default {
  name: 'test',
  once: false,
  
  /**
   * Gère l'événement ready du bot
   * @param client Le client Discord
   */
  async execute(client: BotClient) {
    console.log(`test ${client.user?.tag}`);
  }
};
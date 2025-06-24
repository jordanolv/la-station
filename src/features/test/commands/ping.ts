import { Message } from 'discord.js';
import { BotClient } from '../../../bot/client';

export default {
  name: 'ping',
  description: 'Répond avec Pong!',
  usage: 'ping',
  
  async execute(message: Message, args: string[]) {
    try {
      const startTime = Date.now();
      const reply = await message.reply('Pinging...');
      const endTime = Date.now();
      
      const ping = endTime - startTime;
      const apiPing = Math.round(message.client.ws.ping);
      
      await reply.edit(`🏓 Pong! \nLatence du bot: ${ping}ms \nLatence de l'API: ${apiPing}ms`);
    } catch (error) {
      console.error('Erreur dans la commande ping:', error);
      await message.reply('Une erreur est survenue lors de l\'exécution de la commande.');
    }
  }
}; 
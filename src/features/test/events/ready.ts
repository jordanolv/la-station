import { Events } from 'discord.js';
import { BotClient } from '../../../bot/client';

export default {
  name: Events.ClientReady,
  once: true,

  execute(client: BotClient) {
    console.log(`✅ Feature de test chargée avec succès!`);
    console.log(`🔍 La feature test contient une commande "ping" et une slash command "/hello"`);
  }
}; 
import { Events } from 'discord.js';
import { BotClient } from '../../../bot/client';

export default {
  name: Events.ClientReady,
  once: true,

  execute(client: BotClient) {
    console.log(`✅ Feature User chargée avec succès!`);
    console.log(`🔍 La feature User contient les commandes slash "/me", "/bio" et "/birthday"`);
  }
}; 
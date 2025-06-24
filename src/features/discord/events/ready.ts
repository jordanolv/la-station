import { Events } from 'discord.js';
import { BotClient } from '../../../bot/client';

export default {
  name: Events.ClientReady,
  once: true,

  execute(client: BotClient) {
    console.log(`✅ Feature Discord chargée avec succès!`);
    console.log(`🔍 La feature Discord gère les événements de base comme voiceStateUpdate, messageCreate, etc.`);
  }
}; 
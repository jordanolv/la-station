import { Events, Message } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.MessageDelete,
  once: false,

  async execute(client: BotClient, message: Message) {
    try {
      // Ignorer les messages des bots
      if (message.author?.bot) return;
      
      // Ignorer les messages en DM
      if (!message.guild) return;
      
      // Ignorer les messages sans contenu (embeds uniquement, etc.)
      if (!message.content && message.attachments.size === 0) return;

      // Logger la suppression
      await LogService.logMessageDelete(
        client,
        message.guild.id,
        message.author?.id || null,
        message.author?.username || null,
        message.channel.id,
        message.id,
        message.content || '[Fichier attaché]'
      );

    } catch (error) {
      console.error('Erreur dans l\'événement messageDelete:', error);
    }
  }
};
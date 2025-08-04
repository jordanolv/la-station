import { Events, Message } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.MessageUpdate,
  once: false,

  async execute(client: BotClient, oldMessage: Message, newMessage: Message) {
    try {
      // Ignorer les messages des bots
      if (oldMessage.author?.bot || newMessage.author?.bot) return;
      
      // Ignorer les messages en DM
      if (!oldMessage.guild || !newMessage.guild) return;
      
      // Ignorer si le contenu n'a pas changé (par exemple, juste des embeds)
      if (oldMessage.content === newMessage.content) return;

      // Logger la modification
      await LogService.logMessageEdit(
        client,
        oldMessage.guild.id,
        oldMessage.author.id,
        oldMessage.author.username,
        oldMessage.channel.id,
        oldMessage.id,
        oldMessage.content,
        newMessage.content
      );

    } catch (error) {
      console.error('Erreur dans l\'événement messageUpdate:', error);
    }
  }
};
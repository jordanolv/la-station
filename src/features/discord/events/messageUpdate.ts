import { Events, Message, PartialMessage } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.MessageUpdate,
  once: false,

  async execute(client: BotClient, oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    try {
      if (!newMessage.guild) return;
      await LogService.logMessageEdit(oldMessage, newMessage);
    } catch (error) {
      console.error('[messageUpdate] Erreur:', error);
    }
  },
};

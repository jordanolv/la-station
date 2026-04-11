import { Events, Message, PartialMessage } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.MessageDelete,
  once: false,

  async execute(client: BotClient, message: Message | PartialMessage) {
    try {
      if (!message.guild) return;
      await LogService.logMessageDelete(message);
    } catch (error) {
      console.error('[messageDelete] Erreur:', error);
    }
  },
};

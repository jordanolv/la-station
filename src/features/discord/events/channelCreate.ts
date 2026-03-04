import { Events, GuildChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.ChannelCreate,
  once: false,

  async execute(client: BotClient, channel: GuildChannel) {
    try {
      if (!channel.guild) return;
      await LogService.logChannelCreate(client, channel);
    } catch (error) {
      console.error('[channelCreate] Erreur:', error);
    }
  },
};

import { Events, GuildChannel, DMChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.ChannelDelete,
  once: false,

  async execute(client: BotClient, channel: GuildChannel | DMChannel) {
    try {
      if (!('guild' in channel)) return;
      await LogService.logChannelDelete(client, channel as GuildChannel);
    } catch (error) {
      console.error('[channelDelete] Erreur:', error);
    }
  },
};

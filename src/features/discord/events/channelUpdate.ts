import { Events, GuildChannel, DMChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.ChannelUpdate,
  once: false,

  async execute(client: BotClient, oldChannel: GuildChannel | DMChannel, newChannel: GuildChannel | DMChannel) {
    try {
      if (!('guild' in newChannel)) return;
      await LogService.logChannelUpdate(client, oldChannel as GuildChannel, newChannel as GuildChannel);
    } catch (error) {
      console.error('[channelUpdate] Erreur:', error);
    }
  },
};

import { Events, GuildBan } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.GuildBanAdd,
  once: false,

  async execute(client: BotClient, ban: GuildBan) {
    try {
      await LogService.logBanAdd(ban.guild, ban.user);
    } catch (error) {
      console.error('[guildBanAdd] Erreur:', error);
    }
  },
};

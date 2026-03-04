import { Events, GuildMember } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.GuildMemberAdd,
  once: false,

  async execute(client: BotClient, member: GuildMember) {
    try {
      await LogService.logMemberJoin(client, member);
    } catch (error) {
      console.error('[guildMemberAdd] Erreur:', error);
    }
  },
};

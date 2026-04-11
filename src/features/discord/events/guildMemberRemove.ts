import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.GuildMemberRemove,
  once: false,

  async execute(client: BotClient, member: GuildMember | PartialGuildMember) {
    try {
      await LogService.logMemberLeave(member);
    } catch (error) {
      console.error('[guildMemberRemove] Erreur:', error);
    }
  },
};

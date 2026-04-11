import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.GuildMemberUpdate,
  once: false,

  async execute(client: BotClient, oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    try {
      await LogService.logMemberUpdate(oldMember, newMember);
    } catch (error) {
      console.error('[guildMemberUpdate] Erreur:', error);
    }
  },
};

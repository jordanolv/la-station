import { Events, Role } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.GuildRoleDelete,
  once: false,

  async execute(client: BotClient, role: Role) {
    try {
      await LogService.logRoleDelete(role);
    } catch (error) {
      console.error('[roleDelete] Erreur:', error);
    }
  },
};

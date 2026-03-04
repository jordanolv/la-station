import { Events, Role } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.GuildRoleUpdate,
  once: false,

  async execute(client: BotClient, oldRole: Role, newRole: Role) {
    try {
      await LogService.logRoleUpdate(client, oldRole, newRole);
    } catch (error) {
      console.error('[roleUpdate] Erreur:', error);
    }
  },
};

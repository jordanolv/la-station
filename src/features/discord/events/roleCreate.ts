import { Events, Role } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.GuildRoleCreate,
  once: false,

  async execute(client: BotClient, role: Role) {
    try {
      await LogService.logRoleCreate(client, role);
    } catch (error) {
      console.error('[roleCreate] Erreur:', error);
    }
  },
};

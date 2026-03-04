import { Events, Invite } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.InviteDelete,
  once: false,

  async execute(client: BotClient, invite: Invite) {
    try {
      await LogService.logInviteDelete(client, invite);
    } catch (error) {
      console.error('[inviteDelete] Erreur:', error);
    }
  },
};

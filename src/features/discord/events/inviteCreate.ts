import { Events, Invite } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.InviteCreate,
  once: false,

  async execute(client: BotClient, invite: Invite) {
    try {
      await LogService.logInviteCreate(invite);
    } catch (error) {
      console.error('[inviteCreate] Erreur:', error);
    }
  },
};

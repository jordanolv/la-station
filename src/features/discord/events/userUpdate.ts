import { Events, User, PartialUser } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogService } from '../../../shared/logs/logs.service';

export default {
  name: Events.UserUpdate,
  once: false,

  async execute(client: BotClient, oldUser: User | PartialUser, newUser: User) {
    try {
      await LogService.logUserUpdate(oldUser as User, newUser);
    } catch (error) {
      console.error('[userUpdate] Erreur:', error);
    }
  },
};

import { BotClient } from '../../../BotClient';
import { Events, User } from 'discord.js';
import { UserService } from '@database/services/UserService';
export default {
  name: Events.UserUpdate,
  once: false,
  
  /**
   * Gère l'événement ready du bot
   * @param client Le client Discord 
   */
  async execute(client: BotClient, oldUser: User, newUser: User) {
    console.log('in userUpdate');
    if (oldUser.username !== newUser.username) {
      await UserService.updateUser(newUser.id, { name: newUser.username });
      console.log(`Username mis à jour pour ${newUser.id} -> ${newUser.username}`);
    }
  }
};
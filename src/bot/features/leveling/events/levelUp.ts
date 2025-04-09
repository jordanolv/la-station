import { BotClient } from '../../../BotClient';
import { IUser } from '../../../../database/models/User';
export default {
  name: 'levelUp',
  once: false,
  
  /**
   * Gère l'événement ready du bot
   * @param client Le client Discord
   * @param user L'utilisateur qui a atteint le niveau
   */
  async execute(client: BotClient, user: IUser) {
    console.log(`${user.name} a atteint le niveau ${user.profil.lvl}`);
  }
};
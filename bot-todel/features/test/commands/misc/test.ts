import { Message } from 'discord.js';
import { UserService } from '../../../../../database/services/UserService';
import { IGuild } from '@/database/models/Guild';

export default {
  name: 'test',
  description: 'Une commande de test simple',
  usage: 'test',

  /**
   * Exécute la commande test
   * @param message Le message Discord
   * @param args Les arguments de la commande
   * @param guildData Les données du serveur
   */
  async execute(message: Message, args: string[], guildData: IGuild) {
    try {
      await message.reply({
        content: '✅ La commande test fonctionne correctement !'
      });

      const user = await UserService.getGlobalUserByDiscordId(message.author.id);
      console.log(user);

    } catch (error) {
      console.error('Erreur dans la commande test:', error);


      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
};

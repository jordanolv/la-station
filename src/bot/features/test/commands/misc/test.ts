import { Message } from 'discord.js';
import * as Sentry from '@sentry/node';
import { UserService } from '../../../../../database/services/UserService';
export default {
  name: 'test',
  description: 'Une commande de test simple',
  usage: 'test',

  /**
   * Exécute la commande test
   * @param message Le message Discord
   * @param args Les arguments de la commande
   */
  async execute(message: Message, args: string[]) {
    try {
      await message.reply({
        content: '✅ La commande test fonctionne correctement !'
      });

      const user = await UserService.getUserByDiscordId(message.author.id);
      console.log(user);

    } catch (error) {
      console.error('Erreur dans la commande test:', error);

      // Envoie l’erreur à Sentry
      Sentry.captureException(error);

      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
};

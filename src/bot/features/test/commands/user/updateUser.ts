import { Message } from 'discord.js';
import * as Sentry from '@sentry/node';
import { UserService } from '../../../../../database/services/UserService';
export default {
  name: 'test-update-user',
  description: 'Mise à jour d\'un utilisateur',
  usage: 'test-update-user',

  /**
   * Exécute la commande test
   * @param message Le message Discord
   */
  async execute(message: Message) {
    const user = await UserService.getUserByDiscordId(message.author.id);
    if (!user) {
      return message.reply('Vous n\'êtes pas enregistré dans la base de données.');
    }

    await UserService.updateUser(user.discordId, {
      profil: {
        money: 1000,
        exp: 1000,
        lvl: 10,
      },
      bio: 'Hello, je suis un test',
      stats: {
        totalMsg: 1000,
        voiceTime: 1000,
        voiceHistory: [
          {
            date: new Date(),
            time: 1000,
          },
        ],
      },
      infos: {
        registeredAt: user.infos.registeredAt,
        updatedAt: new Date(),
        birthDate: user.infos.birthDate || null,
      },
    });

    message.reply('Utilisateur mis à jour avec succès.');
  }
};

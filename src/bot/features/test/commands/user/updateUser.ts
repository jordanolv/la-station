import { Message } from 'discord.js';
import { UserService } from '../../../../../database/services/UserService.js';
export default {
  name: 'test-update-user',
  description: 'Mise à jour d\'un utilisateur',
  usage: 'test-update-user',

  /**
   * Exécute la commande test
   * @param message Le message Discord
   */
  async execute(message: Message) {
    if (!message.guild) return message.reply('Cette commande doit être utilisée dans un serveur.');
    
    const user = await UserService.getGuildUserByDiscordId(message.author.id, message.guild.id);
    if (!user) {
      return message.reply('Vous n\'êtes pas enregistré dans la base de données.');
    }

    await UserService.updateGuildUser(user.discordId, user.guildId, {
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

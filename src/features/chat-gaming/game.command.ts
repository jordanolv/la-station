import { Message } from 'discord.js';
import { GuildService } from '../../bot/services/guild.service';
import { LogService } from '../../shared/logs/logs.service';
import { MESSAGE_DELETE_TIMEOUT } from '../../shared/constants';

export default {
  name: 'enable-chatGaming',
  description: 'Active ou désactive la fonctionnalité chatGaming',
  usage: 'enable-chatGaming <true/false>',
  roles: ['1160997258247032963'],

  /**
   * Active ou désactive la fonctionnalité chatGaming
   * @param message Le message Discord
   * @param args Les arguments de la commande
   */
  async execute(message: Message, args: string[]) {
    try {
      // Vérifier si un argument a été fourni
      if (!args.length) {
        return message.reply({
          content: '❌ Veuillez spécifier true ou false. Exemple: `enable-chatGaming true`'
        });
      }

      const enableValue = args[0].toLowerCase();

      // Vérifier que l'argument est valide
      if (enableValue !== 'true' && enableValue !== 'false') {
        return message.reply({
          content: '❌ L\'argument doit être true ou false. Exemple: `enable-chatGaming true`'
        });
      }

      const isEnabled = enableValue === 'true';

      // Mettre à jour le statut dans la base de données
      await GuildService.updateFeatureSettings(message.guild?.id || '', 'chatGaming', {
        enabled: isEnabled,
      });

      // Ajouter le log
      await LogService.sendLog(
        message.guild?.id || '',
        `La fonctionnalité chatGaming a été ${isEnabled ? 'activée' : 'désactivée'} par ${message.author.tag}`,
        'info'
      );
   
      const reply = await message.reply({
        content: `✅ La fonctionnalité chatGaming a été ${isEnabled ? 'activée' : 'désactivée'} !`
      });

      setTimeout(() => { reply.delete(); message.delete(); }, MESSAGE_DELETE_TIMEOUT);
    } catch (error) {
      console.error('Erreur dans la commande enable-chatGaming:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
}; 
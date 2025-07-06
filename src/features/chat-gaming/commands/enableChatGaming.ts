import { Message } from 'discord.js';
import ChatGamingModel from '../models/chatGaming.model';
import { MESSAGE_DELETE_TIMEOUT } from '../../../shared/constants';

export default {
  name: 'enable-chatgaming',
  description: 'Active ou désactive la fonctionnalité chatGaming',
  usage: 'enable-chatgaming <true/false>',
  roles: ['1160997258247032963'],

  async execute(message: Message, args: string[]) {
    try {
      if (!args.length) {
        return message.reply({
          content: '❌ Veuillez spécifier true ou false. Exemple: `enable-chatgaming true`'
        });
      }

      const enableValue = args[0].toLowerCase();

      if (enableValue !== 'true' && enableValue !== 'false') {
        return message.reply({
          content: '❌ L\'argument doit être true ou false. Exemple: `enable-chatgaming true`'
        });
      }

      const isEnabled = enableValue === 'true';

      await ChatGamingModel.findOneAndUpdate(
        { guildId: message.guild?.id },
        { 
          guildId: message.guild?.id,
          enabled: isEnabled 
        },
        { upsert: true, new: true }
      );
   
      const reply = await message.reply({
        content: `✅ La fonctionnalité chatGaming a été ${isEnabled ? 'activée' : 'désactivée'} !`
      });

      setTimeout(() => { reply.delete(); message.delete(); }, MESSAGE_DELETE_TIMEOUT);
    } catch (error) {
      console.error('Erreur dans la commande enable-chatgaming:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
}; 
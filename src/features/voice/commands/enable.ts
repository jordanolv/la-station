import { Message } from 'discord.js';
import { VoiceService } from '../services/voice.service';

export default {
  name: 'voc-enable',
  description: 'Active ou désactive la fonctionnalité de gestion des canaux vocaux',
  usage: 'voc-enable <true/false>',

  async execute(message: Message, args: string[]) {
    try {
      if (!args.length) {
        return message.reply({
          content: '❌ Veuillez spécifier true ou false. Exemple: `voc-enable true`'
        });
      }

      const enableValue = args[0].toLowerCase();

      if (enableValue !== 'true' && enableValue !== 'false') {
        return message.reply({
          content: '❌ L\'argument doit être true ou false. Exemple: `voc-enable true`'
        });
      }

      const isEnabled = enableValue === 'true';

      await VoiceService.getOrCreateConfig();
      await VoiceService.toggleFeature(isEnabled);

      await message.reply({
        content: `✅ La fonctionnalité de gestion des canaux vocaux a été ${isEnabled ? 'activée' : 'désactivée'} !`
      });
    } catch (error) {
      console.error('Erreur dans la commande voc-enable:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
};

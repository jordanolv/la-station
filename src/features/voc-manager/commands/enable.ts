import { Message } from 'discord.js';
import { VocManagerService } from '../vocManager.service';

export default {
  name: 'voc-enable',
  description: 'Active ou désactive la fonctionnalité de gestion des canaux vocaux',
  usage: 'voc-enable <true/false>',
  
  async execute(message: Message, args: string[]) {
    try {
      // Vérifier si un argument a été fourni
      if (!args.length) {
        return message.reply({
          content: '❌ Veuillez spécifier true ou false. Exemple: `voc-enable true`'
        });
      }

      const enableValue = args[0].toLowerCase();

      // Vérifier que l'argument est valide
      if (enableValue !== 'true' && enableValue !== 'false') {
        return message.reply({
          content: '❌ L\'argument doit être true ou false. Exemple: `voc-enable true`'
        });
      }

      const isEnabled = enableValue === 'true';
      const guildId = message.guild?.id;

      if (!guildId) {
        return message.reply({
          content: '❌ Cette commande ne peut être utilisée que dans un serveur.'
        });
      }

      // Récupérer ou créer la configuration
      const vocManager = await VocManagerService.getOrCreateVocManager(guildId);
      
      // Activer ou désactiver la fonctionnalité
      await VocManagerService.toggleFeature(guildId, isEnabled);

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
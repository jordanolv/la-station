import { Message, TextChannel } from 'discord.js';
import { GuildService } from '../../../../database/services/GuildService';

export default {
  name: 'set-channel-chatGaming',
  description: 'Définit le salon vocal pour le chatGaming',
  usage: 'set-channel-chatGaming #channel',
  
  /**
   * Définit le salon vocal pour le chatGaming
   * @param message Le message Discord
   * @param args Les arguments de la commande
   */
  async execute(message: Message, args: string[]) {
    try {
      // Vérifier si un channel a été mentionné
      if (!args.length || !message.mentions.channels.first()) {
        return message.reply({
          content: '❌ Veuillez mentionner un salon vocal. Exemple: `set-channel-chatGaming #nom-du-salon`'
        });
      }

      const channel = message.mentions.channels.first();

      if (!channel) {
        return message.reply({
          content: '❌ Veuillez mentionner un salon vocal valide. Exemple: `set-channel-chatGaming #nom-du-salon`'
        });
      }
      
      // Utiliser GuildService au lieu d'accéder directement au modèle
      await GuildService.updateFeatureSettings(message.guild?.id || '', 'chatGaming', {
        channelId: channel.id
      });

      await message.reply({
        content: `✅ Le salon ${channel} a été défini comme salon vocal pour le chatGaming!`
      });
    } catch (error) {
      console.error('Erreur dans la commande set-channel-chatGaming:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
};
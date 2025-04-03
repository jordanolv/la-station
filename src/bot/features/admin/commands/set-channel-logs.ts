import { Message, TextChannel } from 'discord.js';
import { GuildService } from '../../../../database/services/GuildService';

export default {
  name: 'set-channel-logs',
  description: 'Définit le salon pour les logs',
  usage: 'set-logs-channel #channel',
  
  async execute(message: Message, args: string[]) {
    try {
      if (!args.length || !message.mentions.channels.first()) {
        return message.reply({
          content: '❌ Veuillez mentionner un salon textuel. Exemple: `set-logs-channel #logs`'
        });
      }

      const channel = message.mentions.channels.first() as TextChannel;
      
      if (!channel || channel.type !== 0) {
        return message.reply({
          content: '❌ Veuillez mentionner un salon textuel valide.'
        });
      }

        await GuildService.updateFeatureSettings(message.guild?.id || '', 'logs', {
          channel: channel.id
      });

      const reply = await message.reply({
        content: `✅ Le salon ${channel} a été défini comme salon de logs!`
      });

      setTimeout(() => {
        reply.delete();
        message.delete();
      }, 5000);
    } catch (error) {
      console.error('Erreur dans la commande set-logs-channel:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
};
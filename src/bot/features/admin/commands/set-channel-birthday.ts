import { Message, TextChannel } from 'discord.js';
import { GuildService } from '../../../../database/services/GuildService.js';
import { IGuild } from '../../../../database/models/Guild.js';

export default {
  name: 'set-channel-birthday',
  description: 'Définit le salon pour les anniversaires',
  usage: 'set-channel-birthday #channel',
  
  async execute(message: Message, args: string[], guildData: IGuild) {
    try {
      if (!args.length || !message.mentions.channels.first()) {
        return message.reply({
          content: '❌ Veuillez mentionner un salon textuel. Exemple: `set-birthday-channel #birthday`'
        });
      }

      const channel = message.mentions.channels.first() as TextChannel;
      
      if (!channel || channel.type !== 0) {
        return message.reply({
          content: '❌ Veuillez mentionner un salon textuel valide.'
        });
      }

      if (!guildData) {
        return message.reply({
          content: '❌ Une erreur est survenue lors de la récupération des données du serveur.'
        });
      }

      await GuildService.updateSettings(message.guild?.id || '', {
        ...guildData.config,
        channels: {
          birthday: channel.id
        }
      });

      const reply = await message.reply({
        content: `✅ Le salon ${channel} a été défini comme salon d'anniversaire!`
      });

      setTimeout(() => {
        reply.delete();
        message.delete();
      }, 5000);
    } catch (error) {
      console.error('Erreur dans la commande set-birthday-channel:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
};
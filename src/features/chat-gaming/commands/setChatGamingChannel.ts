import { Message, ChannelType } from 'discord.js';
import ChatGamingModel from '../models/chatGaming.model';
import { MESSAGE_DELETE_TIMEOUT } from '../../../shared/constants';

export default {
  name: 'set-channel-chatgaming',
  description: 'Définit le canal pour les jeux communautaires',
  usage: 'set-channel-chatgaming <#canal>',
  roles: ['1160997258247032963'],

  async execute(message: Message, args: string[]) {
    try {
      if (!args.length) {
        return message.reply({
          content: '❌ Veuillez mentionner un canal. Exemple: `set-channel-chatgaming #gaming`'
        });
      }

      const channel = message.mentions.channels.first();
      if (!channel) {
        return message.reply({
          content: '❌ Canal invalide. Veuillez mentionner un canal existant.'
        });
      }

      if (channel.type !== ChannelType.GuildText) {
        return message.reply({
          content: '❌ Le canal doit être un canal textuel.'
        });
      }

      await ChatGamingModel.findOneAndUpdate(
        { guildId: message.guild?.id },
        { 
          guildId: message.guild?.id,
          channelId: channel.id,
          enabled: true
        },
        { upsert: true, new: true }
      );

      const reply = await message.reply({
        content: `✅ Le canal pour les jeux communautaires a été défini sur ${channel}!`
      });

      setTimeout(() => { reply.delete(); message.delete(); }, MESSAGE_DELETE_TIMEOUT);
    } catch (error) {
      console.error('Erreur dans la commande set-channel-chatgaming:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
};
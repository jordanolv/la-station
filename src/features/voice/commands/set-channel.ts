import { ChannelType, Message } from 'discord.js';
import { VoiceService } from '../services/voice.service';

export default {
  name: 'voc-set-channel',
  description: 'Définit un canal vocal qui créera un nouveau canal lorsqu\'un utilisateur le rejoint',
  usage: 'voc-set-channel #canal-vocal #catégorie [modèle-de-nom]',

  async execute(message: Message, args: string[]) {
    try {
      if (message.mentions.channels.size < 2) {
        return message.reply({
          content: '❌ Veuillez mentionner un canal vocal et une catégorie. Exemple: `voc-set-channel #canal-vocal #catégorie [modèle-de-nom]`'
        });
      }

      const mentionedChannels = Array.from(message.mentions.channels.values());
      const voiceChannel = mentionedChannels[0];
      const categoryChannel = mentionedChannels[1];

      if (voiceChannel.type !== ChannelType.GuildVoice) {
        return message.reply({
          content: '❌ Le premier canal mentionné doit être un canal vocal.'
        });
      }

      if (categoryChannel.type !== ChannelType.GuildCategory) {
        return message.reply({
          content: '❌ Le deuxième canal mentionné doit être une catégorie.'
        });
      }

      const template = args.slice(2).join(' ') || '{mountain} #{count}';

      await VoiceService.addJoinChannel(
        voiceChannel.id,
        categoryChannel.id,
        template
      );

      await message.reply({
        content: `✅ Le canal ${voiceChannel} a été configuré pour créer de nouveaux canaux vocaux dans la catégorie ${categoryChannel} !`
      });
    } catch (error) {
      console.error('Erreur dans la commande voc-set-channel:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
};

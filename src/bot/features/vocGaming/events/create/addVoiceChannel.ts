import { BotClient } from '../../../../BotClient';
import { ChannelType } from 'discord.js';
import { VocGamingService } from '../../../../services/VocGamingService';

export default {
  name: 'addVoiceChannel',
  once: false,

  async execute(client: BotClient, member: any, guildData: any) {
    try {
        const channel = await member.guild.channels.create({
          name: `🎮 Gaming ${guildData.features.vocGaming.nbChannelsCreated + 1}`,
          type: ChannelType.GuildVoice,
          parent: member.channel.parentId,
        });

        await member.member.voice.setChannel(channel);

        // Mettre à jour la base de données
        await VocGamingService.addChannel(member.guild.id, channel.id);
    } catch (error) {
      console.error('Erreur dans l\'événement addVoiceChannel:', error);
    }
  }
};

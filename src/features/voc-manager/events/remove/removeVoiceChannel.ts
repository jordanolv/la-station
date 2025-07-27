import { BotClient } from '../../../../bot/client';
import { VocManagerService } from '../../services/vocManager.service';

export default {
  name: 'removeVoiceChannel',
  once: false,

  async execute(client: BotClient, oldMember: any, guildData: any) {
    try {
      if (guildData.features?.vocGaming?.channelsCreated.length < 1) return;

      for (const channelId of guildData.features.vocGaming.channelsCreated) {
        const channel = oldMember.guild.channels.cache.get(channelId);
        if (channel && channel.members.size <= 0) {
          await channel.delete();

          // Mettre à jour la base de données
          await VocManagerService.removeChannel(oldMember.guild.id, channelId);
        }
      }
    } catch (error) {
      console.error('Erreur dans l\'événement removeVoiceChannel:', error);
    }
  }
};

import { BotClient } from '../../../../BotClient';
import { VocGamingService } from '../../../../services/VocGamingService';
import * as Sentry from '@sentry/node';

export default {
  name: 'removeVoiceChannel',
  once: false,

  async execute(client: BotClient, oldMember: any, guildData: any) {
    try {
      if (!guildData.features?.vocGaming?.channelsCreated) return;

      for (const channelId of guildData.features.vocGaming.channelsCreated) {
        const channel = oldMember.guild.channels.cache.get(channelId);
        if (channel && channel.members.size <= 0) {
          await channel.delete();

          // Mettre à jour la base de données
          await VocGamingService.removeChannel(oldMember.guild.id, channelId);
        }
      }
    } catch (error) {
      console.error('Erreur dans l\'événement removeVoiceChannel:', error);

      // 👇 Envoie l'erreur à Sentry avec contexte
      Sentry.withScope(scope => {
        scope.setTag('event', 'removeVoiceChannel');
        scope.setUser({ id: oldMember.id });
        scope.setContext('Guild', {
          id: oldMember.guild.id,
          name: oldMember.guild.name,
        });
        Sentry.captureException(error);
      });
    }
  }
};

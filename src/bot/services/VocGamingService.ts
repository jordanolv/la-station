import { GuildService } from '../../database/services/GuildService.js';
import { IGuild } from '../../database/models/Guild.js';

export class VocGamingService {
  static async addChannel(guildId: string, channelId: string): Promise<IGuild | null> {
    const guildData = await GuildService.getGuildById(guildId);
    if (!guildData) return null;

    return GuildService.updateFeatureSettings(guildId, 'vocGaming', {
      channelsCreated: [...guildData.features.vocGaming.channelsCreated, channelId],
      nbChannelsCreated: guildData.features.vocGaming.nbChannelsCreated + 1
    });
  }

  static async removeChannel(guildId: string, channelId: string): Promise<IGuild | null> {
    const guildData = await GuildService.getGuildById(guildId);
    if (!guildData) return null;

    const updatedChannels = guildData.features.vocGaming.channelsCreated.filter(
      (id: string) => id !== channelId
    );

    return GuildService.updateFeatureSettings(guildId, 'vocGaming', {
      channelsCreated: updatedChannels,
    });
  }

  static async setChannelToJoin(guildId: string, channelId: string): Promise<IGuild | null> {
    return GuildService.updateFeatureSettings(guildId, 'vocGaming', {
      channelToJoin: channelId
    });
  }

  static async toggleFeature(guildId: string, enabled: boolean): Promise<IGuild | null> {
    return GuildService.updateFeatureSettings(guildId, 'vocGaming', {
      enabled
    });
  }
} 
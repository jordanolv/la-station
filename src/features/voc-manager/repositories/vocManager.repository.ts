import GuildModel from '../../discord/models/guild.model';
import { GuildService } from '../../discord/services/guild.service';
import { IVocManager, IJoinChannel } from '../models/vocManagerConfig.model';

const DEFAULT_VOC_MANAGER: IVocManager = {
  enabled: false,
  joinChannels: [],
  createdChannels: [],
  channelCount: 0,
};

export class VocManagerRepository {
  static async get(guildId: string): Promise<IVocManager | null> {
    const guild = await GuildModel.findOne({ guildId });
    return guild?.features?.vocManager ?? null;
  }

  static async getOrCreate(guildId: string): Promise<IVocManager> {
    const existing = await this.get(guildId);
    if (existing) return existing;

    const guild = await GuildService.getOrCreateGuild(guildId);
    guild.features = guild.features ?? {};
    guild.features.vocManager = { ...DEFAULT_VOC_MANAGER };
    await guild.save();
    return guild.features.vocManager;
  }

  static async toggle(guildId: string, enabled: boolean): Promise<IVocManager> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    guild.features = guild.features ?? {};
    guild.features.vocManager = guild.features.vocManager ?? { ...DEFAULT_VOC_MANAGER };
    guild.features.vocManager.enabled = enabled;
    await guild.save();
    return guild.features.vocManager;
  }

  static async setNotificationChannel(guildId: string, channelId: string | null): Promise<IVocManager> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    guild.features = guild.features ?? {};
    guild.features.vocManager = guild.features.vocManager ?? { ...DEFAULT_VOC_MANAGER };
    guild.features.vocManager.notificationChannelId = channelId ?? undefined;
    await guild.save();
    return guild.features.vocManager;
  }

  static async upsertJoinChannel(guildId: string, channelId: string, category: string, nameTemplate: string): Promise<IVocManager> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    guild.features = guild.features ?? {};
    guild.features.vocManager = guild.features.vocManager ?? { ...DEFAULT_VOC_MANAGER };

    const channels = guild.features.vocManager.joinChannels;
    const idx = channels.findIndex(c => c.id === channelId);
    const entry: IJoinChannel = { id: channelId, category, nameTemplate };

    if (idx !== -1) channels[idx] = entry;
    else channels.push(entry);

    await guild.save();
    return guild.features.vocManager;
  }

  static async removeJoinChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    if (!guild.features?.vocManager) return null;
    guild.features.vocManager.joinChannels = guild.features.vocManager.joinChannels.filter(c => c.id !== channelId);
    await guild.save();
    return guild.features.vocManager;
  }

  static async updateJoinChannel(guildId: string, channelId: string, patch: Partial<Pick<IJoinChannel, 'nameTemplate' | 'category'>>): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    if (!guild.features?.vocManager) return null;

    const idx = guild.features.vocManager.joinChannels.findIndex(c => c.id === channelId);
    if (idx === -1) return null;

    Object.assign(guild.features.vocManager.joinChannels[idx], patch);
    await guild.save();
    return guild.features.vocManager;
  }

  static async addCreatedChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    if (!guild.features?.vocManager) return null;
    guild.features.vocManager.createdChannels.push(channelId);
    guild.features.vocManager.channelCount += 1;
    await guild.save();
    return guild.features.vocManager;
  }

  static async removeCreatedChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    if (!guild.features?.vocManager) return null;
    guild.features.vocManager.createdChannels = guild.features.vocManager.createdChannels.filter(id => id !== channelId);
    await guild.save();
    return guild.features.vocManager;
  }
}

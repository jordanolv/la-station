import GuildModel, { IGuild } from '../models/Guild';

export class GuildService {
  static async ensureGuild(guildId: string, name: string): Promise<IGuild> {
    let guildData = await this.getGuildById(guildId);
    if (!guildData) {
      guildData = await this.createOrUpdateGuild(guildId, name);
    }
    return guildData;
  }

  static async getGuildById(guildId: string): Promise<IGuild | null> {
    return GuildModel.findOne({ guildId: guildId });
  }

  static async createOrUpdateGuild(
    guildId: string,
    name: string,
    prefix?: string
  ): Promise<IGuild> {
    const existing = await GuildModel.findOne({ guildId: guildId });

    if (existing) {
      existing.name = name;
      if (prefix) existing.config.prefix = prefix;
      return existing.save();
    }

    return GuildModel.create({
      guildId: guildId,
      name,
      registeredAt: new Date(),
      config: { prefix: prefix || '!' },
      features: {
        VocGaming: {
          enabled: false,
          channelToJoin: '',
          channelsCreated: [],
          nbChannelsCreated: 0,
        },
        chatGaming: {
          enabled: false,
          channelId: '',
          channelsList: [],
          reactionsList: [],
          nbForumCreated: 0,
        },
        logs: {
          enabled: false,
          channel: '',
        },
      },
    });
  }

  static async updatePrefix(guildId: string, prefix: string): Promise<IGuild | null> {
    return GuildModel.findOneAndUpdate(
      { guildId: guildId },
      { $set: { 'config.prefix': prefix } },
      { new: true }
    );
  }

  static async updateSettings(
    guildId: string,
    settings: Partial<IGuild['config']>
  ): Promise<IGuild | null> {
    return GuildModel.findOneAndUpdate(
      { guildId: guildId },
      { $set: { config: settings } },
      { new: true }
    );
  }

  static async updateFeatureSettings<T extends keyof IGuild['features']>(
    guildId: string,
    featureName: T,
    settings: Partial<IGuild['features'][T]>
  ): Promise<IGuild | null> {
    // On transforme l'objet settings en un objet avec des chemins pointés
    const updates = Object.entries(settings).reduce((acc, [key, value]) => {
      acc[`features.${featureName}.${key}`] = value;
      return acc;
    }, {} as Record<string, any>);

    return GuildModel.findOneAndUpdate(
      { guildId: guildId },
      { $set: updates },
      { new: true }
    );
  }
}

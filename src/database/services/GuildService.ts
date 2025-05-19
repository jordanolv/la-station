import GuildModel, { IGuild } from '../models/Guild.js';

export class GuildService {
  static async ensureGuild(guildId: string, name: string): Promise<IGuild> {
    let guildData = await this.getGuildById(guildId);
    
    if (!guildData) {
      console.log('Guild not found, creating...');
      console.log(guildId);
      guildData = await this.create(guildId, name);
    } else if (guildData.name !== name) {
      guildData.name = name;
      await guildData.save();
    }
    
    return guildData;
  }

  static async findAll(): Promise<IGuild[]> {
    return GuildModel.find({}).exec();
  }

  static async getGuildById(guildId: string): Promise<IGuild | null> {
    if (!guildId) {
      throw new Error('guildId is required');
    }
    return GuildModel.findOne({ guildId }).exec();
  }

  static async create(
    guildId: string,
    name: string,
    prefix?: string
  ): Promise<IGuild> {
    if (!guildId || !name) {
      throw new Error('guildId and name are required');
    }

    console.log('Creating guild...');
    console.log(guildId);
    console.log(name);

    const guild = new GuildModel({
      guildId,
      name,
      config: { prefix: prefix || '!' }
    });

    return guild.save();
  }

  static async updatePrefix(guildId: string, prefix: string): Promise<IGuild | null> {
    if (!guildId) {
      throw new Error('guildId is required');
    }
    return GuildModel.findOneAndUpdate(
      { guildId },
      { $set: { 'config.prefix': prefix } },
      { new: true }
    ).exec();
  }

  static async updateSettings(
    guildId: string,
    settings: Partial<IGuild['config']>
  ): Promise<IGuild | null> {
    if (!guildId) {
      throw new Error('guildId is required');
    }
    return GuildModel.findOneAndUpdate(
      { guildId },
      { $set: { config: settings } },
      { new: true }
    ).exec();
  }

  static async updateFeatureSettings<T extends keyof IGuild['features']>(
    guildId: string,
    featureName: T,
    settings: Partial<IGuild['features'][T]>
  ): Promise<IGuild | null> {
    if (!guildId) {
      throw new Error('guildId is required');
    }
    const updates = Object.entries(settings).reduce((acc, [key, value]) => {
      acc[`features.${featureName}.${key}`] = value;
      return acc;
    }, {} as Record<string, any>);

    return GuildModel.findOneAndUpdate(
      { guildId },
      { $set: updates },
      { new: true }
    ).exec();
  }

  static async getAllGuilds(): Promise<IGuild[]> {
    return GuildModel.find({}).exec();
  }

  //enable or disable a feature for a guild
  static async toggleFeature(guildId: string, featureName: string, enabled: boolean): Promise<IGuild | null> {
    return GuildModel.findOneAndUpdate(
      { guildId },
      { $set: { [`features.${featureName}.enabled`]: enabled } },
      { new: true }
    ).exec();
  }
}
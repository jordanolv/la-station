import MountainConfigModel, { IMountainConfig, IMountainConfigDoc } from '../models/mountain-config.model';

const DEFAULTS: IMountainConfig = {
  enabled: false,
  spawnChannelId: undefined,
  notificationChannelId: undefined,
  spawnSchedule: [],
  activeChannelMountains: {},
};

export class MountainConfigRepository {
  static async get(): Promise<IMountainConfigDoc | null> {
    return MountainConfigModel.findOne();
  }

  static async getOrCreate(): Promise<IMountainConfigDoc> {
    const existing = await this.get();
    if (existing) return existing;
    return MountainConfigModel.create({ ...DEFAULTS });
  }

  static async toggle(enabled: boolean): Promise<IMountainConfigDoc> {
    const doc = await this.getOrCreate();
    doc.enabled = enabled;
    return doc.save();
  }

  static async setSpawnChannel(channelId: string | null): Promise<IMountainConfigDoc> {
    const doc = await this.getOrCreate();
    doc.spawnChannelId = channelId ?? undefined;
    return doc.save();
  }

  static async setNotificationChannel(channelId: string | null): Promise<IMountainConfigDoc> {
    const doc = await this.getOrCreate();
    doc.notificationChannelId = channelId ?? undefined;
    return doc.save();
  }

  static async setSpawnSchedule(dates: Date[]): Promise<void> {
    const doc = await this.getOrCreate();
    doc.spawnSchedule = dates;
    doc.markModified('spawnSchedule');
    await doc.save();
  }

  static async setChannelMountain(channelId: string, mountainId: string): Promise<void> {
    await MountainConfigModel.updateOne(
      {},
      { $set: { [`activeChannelMountains.${channelId}`]: mountainId } },
      { upsert: true },
    );
  }

  static async deleteChannelMountain(channelId: string): Promise<void> {
    await MountainConfigModel.updateOne(
      {},
      { $unset: { [`activeChannelMountains.${channelId}`]: '' } },
    );
  }

  static async setLastSpawnWinner(userId: string): Promise<void> {
    await MountainConfigModel.updateOne({}, { $set: { lastSpawnWinnerId: userId } });
  }

  static async getActiveChannelMountains(): Promise<Map<string, string>> {
    const doc = await this.get();
    const obj = (doc?.activeChannelMountains ?? {}) as Record<string, string>;
    return new Map(Object.entries(obj));
  }
}

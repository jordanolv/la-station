import MountainConfigModel, { IMountainConfig, IMountainConfigDoc } from '../models/mountain-config.model';

const DEFAULTS: IMountainConfig = {
  enabled: false,
  spawnChannelId: undefined,
  notificationChannelId: undefined,
  spawnSchedule: [],
  activeChannelMountains: new Map(),
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
    const doc = await this.getOrCreate();
    doc.activeChannelMountains.set(channelId, mountainId);
    doc.markModified('activeChannelMountains');
    await doc.save();
  }

  static async deleteChannelMountain(channelId: string): Promise<void> {
    const doc = await this.getOrCreate();
    doc.activeChannelMountains.delete(channelId);
    doc.markModified('activeChannelMountains');
    await doc.save();
  }

  static async getActiveChannelMountains(): Promise<Map<string, string>> {
    const doc = await this.get();
    return doc?.activeChannelMountains ?? new Map();
  }
}

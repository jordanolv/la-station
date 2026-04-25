import MountainConfigModel, { IPeakHuntersConfig, IPeakHuntersConfigDoc } from '../models/peak-hunters-config.model';

const DEFAULTS: IPeakHuntersConfig = {
  enabled: false,
  spawnChannelId: undefined,
  notificationChannelId: undefined,
  raidChannelId: undefined,
  spawnSchedule: [],
  activeChannelMountains: {},
};

export class PeakHuntersConfigRepository {
  static async get(): Promise<IPeakHuntersConfigDoc | null> {
    return MountainConfigModel.findOne();
  }

  static async getOrCreate(): Promise<IPeakHuntersConfigDoc> {
    const existing = await this.get();
    if (existing) return existing;
    return MountainConfigModel.create({ ...DEFAULTS });
  }

  static async toggle(enabled: boolean): Promise<IPeakHuntersConfigDoc> {
    const doc = await this.getOrCreate();
    doc.enabled = enabled;
    return doc.save();
  }

  static async setSpawnChannel(channelId: string | null): Promise<IPeakHuntersConfigDoc> {
    const doc = await this.getOrCreate();
    doc.spawnChannelId = channelId ?? undefined;
    return doc.save();
  }

  static async setNotificationChannel(channelId: string | null): Promise<IPeakHuntersConfigDoc> {
    const doc = await this.getOrCreate();
    doc.notificationChannelId = channelId ?? undefined;
    return doc.save();
  }

  static async setRaidChannel(channelId: string | null): Promise<IPeakHuntersConfigDoc> {
    const doc = await this.getOrCreate();
    doc.raidChannelId = channelId ?? undefined;
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

  static async setActiveSpawnMessage(messageId: string): Promise<void> {
    await MountainConfigModel.updateOne({}, { $set: { activeSpawnMessageId: messageId } });
  }

  static async claimSpawn(messageId: string): Promise<boolean> {
    const result = await MountainConfigModel.findOneAndUpdate(
      { activeSpawnMessageId: messageId },
      { $unset: { activeSpawnMessageId: '' } },
    );
    return result !== null;
  }

  static async clearActiveSpawn(): Promise<void> {
    await MountainConfigModel.updateOne({}, { $unset: { activeSpawnMessageId: '' } });
  }

  static async getActiveChannelMountains(): Promise<Map<string, string>> {
    const doc = await this.get();
    const obj = (doc?.activeChannelMountains ?? {}) as Record<string, string>;
    return new Map(Object.entries(obj));
  }

  static async getDailyMountain(): Promise<{ date: string; mountainId: string } | null> {
    const doc = await this.get();
    if (!doc?.dailyMountain) return null;
    return { date: doc.dailyMountain.date, mountainId: doc.dailyMountain.mountainId };
  }

  static async setDailyMountain(date: string, mountainId: string): Promise<void> {
    await MountainConfigModel.updateOne(
      {},
      { $set: { dailyMountain: { date, mountainId } } },
      { upsert: true },
    );
  }
}

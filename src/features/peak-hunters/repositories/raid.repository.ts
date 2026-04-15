import RaidModel, { IRaidDoc } from '../models/raid.model';
import type { MountainRarity } from '../types/peak-hunters.types';

export class RaidRepository {
  static async getActive(): Promise<IRaidDoc | null> {
    return RaidModel.findOne({ status: 'active' });
  }

  static async getLastCompleted(): Promise<IRaidDoc | null> {
    return RaidModel.findOne({ status: { $in: ['completed', 'failed', 'failed_partial'] } })
      .sort({ startedAt: -1 });
  }

  static async create(data: {
    mountainId: string;
    rarity: MountainRarity;
    maxHp: number;
    endsAt: Date;
  }): Promise<IRaidDoc> {
    return RaidModel.create({
      ...data,
      status: 'active',
      currentHp: data.maxHp,
      startedAt: new Date(),
      participants: [],
    });
  }

  static async addContribution(userId: string, points: number): Promise<IRaidDoc | null> {
    const existing = await RaidModel.findOneAndUpdate(
      { status: 'active', 'participants.userId': userId },
      {
        $inc: {
          currentHp: -points,
          'participants.$.contributedPoints': points,
        },
      },
      { new: true },
    );

    if (existing) return existing;

    return RaidModel.findOneAndUpdate(
      { status: 'active' },
      {
        $inc: { currentHp: -points },
        $push: { participants: { userId, contributedPoints: points, rewarded: false } },
      },
      { new: true },
    );
  }

  static async setProgressMessage(raidId: string, messageId: string, channelId: string, threadId?: string): Promise<void> {
    await RaidModel.findByIdAndUpdate(raidId, {
      $set: { progressMessageId: messageId, progressChannelId: channelId, ...(threadId && { threadId }) },
    });
  }

  static async complete(raidId: string): Promise<IRaidDoc | null> {
    return RaidModel.findByIdAndUpdate(
      raidId,
      { $set: { status: 'completed', currentHp: 0 } },
      { new: true },
    );
  }

  static async fail(raidId: string, partial: boolean): Promise<IRaidDoc | null> {
    return RaidModel.findByIdAndUpdate(
      raidId,
      { $set: { status: partial ? 'failed_partial' : 'failed' } },
      { new: true },
    );
  }

  static async markRewarded(raidId: string, userId: string): Promise<void> {
    await RaidModel.findOneAndUpdate(
      { _id: raidId, 'participants.userId': userId },
      { $set: { 'participants.$.rewarded': true } },
    );
  }
}

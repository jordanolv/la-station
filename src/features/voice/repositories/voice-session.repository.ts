import VoiceSessionModel, { IVoiceSessionDoc } from '../models/voice-session.model';

export interface VoiceSessionData {
  userId: string;
  guildId: string;
  channelId: string;
  channelName: string;
  startedAt: Date;
  totalActiveSeconds: number;
  currentActiveStart: Date | null;
}

export class VoiceSessionRepository {
  static async upsert(data: VoiceSessionData): Promise<IVoiceSessionDoc> {
    return VoiceSessionModel.findOneAndUpdate(
      { userId: data.userId },
      {
        $set: {
          guildId: data.guildId,
          channelId: data.channelId,
          channelName: data.channelName,
          startedAt: data.startedAt,
          totalActiveSeconds: data.totalActiveSeconds,
          currentActiveStart: data.currentActiveStart,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  }

  static async getByUserId(userId: string): Promise<IVoiceSessionDoc | null> {
    return VoiceSessionModel.findOne({ userId });
  }

  static async getByChannelId(channelId: string): Promise<IVoiceSessionDoc[]> {
    return VoiceSessionModel.find({ channelId });
  }

  static async deleteByUserId(userId: string): Promise<boolean> {
    const result = await VoiceSessionModel.deleteOne({ userId });
    return result.deletedCount > 0;
  }

  static async deleteAllForGuild(guildId: string): Promise<number> {
    const result = await VoiceSessionModel.deleteMany({ guildId });
    return result.deletedCount ?? 0;
  }
}

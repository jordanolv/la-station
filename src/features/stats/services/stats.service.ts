import { UserRepository } from '../../user/services/user.repository';
import { IUser } from '../../user/models/user.model';

export type VoiceHistorySegment = {
  date: Date;
  seconds: number;
};

export type VoiceHistoryMergeMode = 'append' | 'replace';

export class StatsService {
  private static userRepo = new UserRepository();

  // ─── Voice stats persistence ──────────────────────────────────────────────

  static async updateVoiceStats(params: {
    userId: string;
    username: string;
    totalSeconds: number;
    segments: VoiceHistorySegment[];
  }): Promise<void> {
    const { userId, username, totalSeconds, segments } = params;
    if (!segments.length || totalSeconds <= 0) return;

    try {
      const guildUser = await this.userRepo.findUserById(userId);

      if (guildUser) {
        const addedSeconds = this.applyVoiceSegmentsToUser(guildUser, segments);
        guildUser.infos.updatedAt = new Date();
        guildUser.stats.voiceTime += addedSeconds;
        await guildUser.save();
      } else {
        const newUser = await this.userRepo.createUser({ discordId: userId, name: username || 'Unknown User' });
        const addedSeconds = this.applyVoiceSegmentsToUser(newUser, segments, 'replace');
        newUser.stats.voiceTime = addedSeconds;
        newUser.infos.updatedAt = new Date();
        await newUser.save();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statistiques utilisateur:', error);
      throw error;
    }
  }

  static applyVoiceSegmentsToUser(
    guildUser: IUser,
    segments: VoiceHistorySegment[],
    mode: VoiceHistoryMergeMode = 'append',
  ): number {
    const sanitized = segments
      .map(s => ({ date: this.normalizeDate(s.date), seconds: Math.max(0, Math.floor(s.seconds)) }))
      .filter(s => s.seconds > 0);

    if (!sanitized.length) return 0;

    if (mode === 'replace') {
      guildUser.stats.voiceHistory = [];
      guildUser.stats.voiceTime = 0;
    }

    let addedSeconds = 0;

    for (const segment of sanitized) {
      const existing = guildUser.stats.voiceHistory.find(e => this.isSameDay(e.date, segment.date));
      if (existing) {
        existing.time += segment.seconds;
      } else {
        guildUser.stats.voiceHistory.push({ date: new Date(segment.date), time: segment.seconds } as any);
      }
      addedSeconds += segment.seconds;
    }

    guildUser.stats.voiceHistory.sort((a, b) => a.date.getTime() - b.date.getTime());
    if (guildUser.stats.voiceHistory.length > 100) {
      guildUser.stats.voiceHistory = guildUser.stats.voiceHistory.slice(-100);
    }

    guildUser.infos.updatedAt = new Date();
    return addedSeconds;
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  static async incrementMessageCount(client: any, userId: string, username: string): Promise<void> {
    try {
      const guildUser = await this.userRepo.findUserById(userId);

      if (guildUser) {
        await this.userRepo.updateUser(userId, { stats: { totalMsg: guildUser.stats.totalMsg + 1 } });
      } else {
        const newUser = await this.userRepo.createUser({ discordId: userId, name: username || 'Unknown User' });
        newUser.stats.totalMsg = 1;
        await newUser.save();
      }
    } catch (error) {
      console.error("Erreur lors de l'incrémentation du compteur de messages:", error);
      throw error;
    }
  }

  // ─── Daily segment splitting (used by StatsPlugin) ────────────────────────

  static splitIntoDailySegments(start: Date, end: Date, expectedTotalSeconds: number): VoiceHistorySegment[] {
    const segments: VoiceHistorySegment[] = [];
    let cursor = new Date(start);

    while (cursor < end) {
      const dayStart = this.normalizeDate(cursor);
      const nextDay = new Date(dayStart);
      nextDay.setDate(nextDay.getDate() + 1);

      const segmentEnd = new Date(Math.min(nextDay.getTime(), end.getTime()));
      const diffSeconds = Math.floor((segmentEnd.getTime() - cursor.getTime()) / 1000);

      if (diffSeconds > 0) segments.push({ date: dayStart, seconds: diffSeconds });
      cursor = segmentEnd;
    }

    const accumulated = segments.reduce((acc, s) => acc + s.seconds, 0);
    const delta = expectedTotalSeconds - accumulated;
    if (delta > 0 && segments.length > 0) segments[segments.length - 1].seconds += delta;

    return segments;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private static normalizeDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private static isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
}

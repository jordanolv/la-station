import { BotClient } from '../../../bot/client';
import { getGuildId } from '../../../shared/guild';
import { LogService } from '../../../shared/logs/logs.service';
import { VoicePlugin, VoiceSession, ActivePeriod } from '../../voice/services/voice-session.service';
import { StatsService, VoiceHistorySegment } from './stats.service';

/**
 * Plugin stats pour le voice manager.
 *
 * Reçoit les sessions vocales enrichies (périodes actives détaillées)
 * et persiste le temps vocal en DB avec un split par jour.
 */
export class StatsPlugin implements VoicePlugin {
  async onSessionEnd(session: VoiceSession, client: BotClient): Promise<Record<string, unknown> | void> {
    if (session.activeSeconds <= 0) return;

    const segments = this.buildDailySegments(session.activePeriods);
    if (!segments.length) return;

    try {
      const username = await this.resolveUsername(client, session);

      await StatsService.updateVoiceStats({
        userId: session.userId,
        username,
        totalSeconds: session.activeSeconds,
        segments,
      });

      await LogService.info(
        client,
        `${username} a passé ${this.formatDuration(session.activeSeconds)} en vocal`,
        { feature: 'stats', title: 'Session vocale terminée' },
      );
    } catch (err) {
      console.error('[StatsPlugin] Erreur enregistrement session:', err);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private buildDailySegments(periods: ActivePeriod[]): VoiceHistorySegment[] {
    const allSegments: VoiceHistorySegment[] = [];

    for (const period of periods) {
      const durationSeconds = Math.floor((period.endedAt - period.startedAt) / 1000);
      if (durationSeconds <= 0) continue;

      const segments = StatsService.splitIntoDailySegments(
        new Date(period.startedAt),
        new Date(period.endedAt),
        durationSeconds,
      );
      allSegments.push(...segments);
    }

    return this.mergeSameDaySegments(allSegments);
  }

  private mergeSameDaySegments(segments: VoiceHistorySegment[]): VoiceHistorySegment[] {
    const map = new Map<string, VoiceHistorySegment>();

    for (const seg of segments) {
      const key = `${seg.date.getFullYear()}-${seg.date.getMonth()}-${seg.date.getDate()}`;
      const existing = map.get(key);
      if (existing) {
        existing.seconds += seg.seconds;
      } else {
        map.set(key, { date: new Date(seg.date), seconds: seg.seconds });
      }
    }

    return [...map.values()];
  }

  private async resolveUsername(client: BotClient, session: VoiceSession): Promise<string> {
    try {
      const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
      if (!guild) return 'Unknown User';
      const member = await guild.members.fetch(session.userId).catch(() => null);
      return member?.user.username ?? 'Unknown User';
    } catch {
      return 'Unknown User';
    }
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds} secondes`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (rest === 0) return `${hours} heure${hours > 1 ? 's' : ''}`;
    return `${hours}h${rest.toString().padStart(2, '0')}`;
  }
}

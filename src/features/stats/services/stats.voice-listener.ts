import type { BotClient } from '../../../bot/client';
import { BotEventBus } from '../../../shared/events/bot-event-bus';
import { getGuildId } from '../../../shared/guild';
import { LogService } from '../../../shared/logs/logs.service';
import '../../voice/events/voice.events';
import { StatsService, type VoiceHistorySegment } from './stats.service';

export function registerStatsVoiceListeners(client: BotClient): void {
  BotEventBus.on('voice:session:ended', async event => {
    if (event.activeSeconds <= 0) return;

    try {
      const username = await resolveUsername(client, event.userId);

      const segments: VoiceHistorySegment[] = event.byDay.map(chunk => ({
        date: dayYMDToDate(chunk.dateYMD),
        seconds: chunk.seconds,
      }));

      await StatsService.updateVoiceStats({
        userId: event.userId,
        username,
        totalSeconds: event.activeSeconds,
        segments,
      });

      LogService.info(
        `${username} a passé ${formatDuration(event.activeSeconds)} en vocal`,
        { feature: 'stats', title: 'Session vocale terminée' },
      );
    } catch (err) {
      console.error('[stats.voice-listener] Erreur:', err);
    }
  });
}

function dayYMDToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

async function resolveUsername(client: BotClient, userId: string): Promise<string> {
  try {
    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    if (!guild) return 'Unknown User';
    const member = await guild.members.fetch(userId).catch(() => null);
    return member?.user.username ?? 'Unknown User';
  } catch {
    return 'Unknown User';
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} secondes`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours} heure${hours > 1 ? 's' : ''}`;
  return `${hours}h${rest.toString().padStart(2, '0')}`;
}

import { toZonedTime } from 'date-fns-tz';
import { BotClient } from '../../../../bot/client';
import { GamesForumService } from '../../../discord/services/games-forum.service';
import { LogService } from '../../../../shared/logs/logs.service';
import { PARIS_TZ, toParisDayYMD } from '../../../../shared/time/day-split';
import ArcadeScheduleModel, { IArcadeScheduleDoc, ScheduledGame } from '../models/arcade-schedule.model';

const GAMES: ScheduledGame[] = ['bingo', 'justePrix', 'avalanche'];
const GAME_LABELS: Record<ScheduledGame, string> = {
  bingo: '🎯 Bingo',
  justePrix: '💰 Juste Prix',
  avalanche: "🏔️ L'Avalanche",
};
const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Les 7 jours de la semaine Paris contenant `date`, lundi en premier. */
function weekDays(date: Date): string[] {
  const p = toZonedTime(date, PARIS_TZ);
  const offsetToMonday = (p.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(p);
    d.setDate(p.getDate() - offsetToMonday + i);
    return toParisDayYMD(d);
  });
}

/** Chaque jeu passe au moins une fois, les jours restants sont tirés au hasard. */
export function generateWeek(days: string[]): Record<string, ScheduledGame> {
  const picks = shuffle(GAMES);
  while (picks.length < days.length) picks.push(GAMES[Math.floor(Math.random() * GAMES.length)]);
  return Object.fromEntries(shuffle(picks).map((game, i) => [days[i], game]));
}

export class ArcadeScheduleService {
  // ponytail: dédoublonne les crons de minuit qui tomberaient en même temps
  private static pending: Promise<IArcadeScheduleDoc> | null = null;

  static async isToday(client: BotClient, game: ScheduledGame): Promise<boolean> {
    const week = await this.getOrCreateWeek(client);
    return week.days[toParisDayYMD(new Date())] === game;
  }

  static async getOrCreateWeek(client: BotClient): Promise<IArcadeScheduleDoc> {
    const days = weekDays(new Date());
    const existing = await ArcadeScheduleModel.findOne({ weekKey: days[0] });
    if (existing) return existing;
    if (!this.pending) {
      this.pending = this.createWeek(client, days).finally(() => (this.pending = null));
    }
    return this.pending;
  }

  private static async createWeek(client: BotClient, days: string[]): Promise<IArcadeScheduleDoc> {
    const doc = await ArcadeScheduleModel.create({ weekKey: days[0], days: generateWeek(days) });
    const lines = days.map((d, i) => `**${DAY_LABELS[i]}** · ${GAME_LABELS[doc.days[d]]}`);
    const content = `📅 **Planning des jeux de la semaine**\n${lines.join('\n')}`;
    await GamesForumService.announce(client, content);
    LogService.info(lines.join('\n'), { feature: '🕹️ Arcade', title: '📅 Planning de la semaine' }).catch(() => {});
    return doc;
  }
}

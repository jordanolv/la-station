import { ContainerBuilder, MessageFlags, SeparatorBuilder, TextDisplayBuilder } from 'discord.js';
import { toZonedTime } from 'date-fns-tz';
import { BotClient } from '../../../../bot/client';
import { GamesForumConfig, GamesForumService } from '../../../discord/services/games-forum.service';
import { LogService } from '../../../../shared/logs/logs.service';
import { PARIS_TZ, toParisDayYMD } from '../../../../shared/time/day-split';
import { BINGO_SPAWN_HOUR } from '../../bingo/constants/bingo.constants';
import { JP_SPAWN_HOUR } from '../../juste-prix/constants/juste-prix.constants';
import { AVALANCHE_REGISTRATION_END_HOUR } from '../../avalanche/constants/avalanche.constants';
import { ENIGME_SPAWN_HOUR } from '../../enigme/constants/enigme.constants';
import ArcadeScheduleModel, { IArcadeScheduleDoc, ScheduledGame } from '../models/arcade-schedule.model';

const GAMES: ScheduledGame[] = ['bingo', 'justePrix', 'avalanche', 'enigme'];
const GAME_LABELS: Record<ScheduledGame, string> = {
  bingo: '🎯 Bingo',
  justePrix: '💰 Juste Prix',
  avalanche: "🏔️ L'Avalanche",
  enigme: '🧩 Énigme',
};
const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const THREAD_KEYS: Record<ScheduledGame, 'bingoThreadId' | 'justePrixThreadId' | 'avalancheThreadId' | 'enigmeThreadId'> = {
  bingo: 'bingoThreadId',
  justePrix: 'justePrixThreadId',
  avalanche: 'avalancheThreadId',
  enigme: 'enigmeThreadId',
};
const GAME_HOURS: Record<ScheduledGame, string> = {
  bingo: `${BINGO_SPAWN_HOUR}h`,
  justePrix: `${JP_SPAWN_HOUR}h`,
  avalanche: `inscriptions jusqu'à ${AVALANCHE_REGISTRATION_END_HOUR}h`,
  enigme: `${ENIGME_SPAWN_HOUR}h`,
};
const ACCENT_COLOR = 0xf4a261;

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

/** Chaque jeu passe au moins une fois (si assez de jours), le reste est tiré au hasard. */
export function generateWeek(days: string[]): Record<string, ScheduledGame> {
  const picks = shuffle(GAMES).slice(0, days.length);
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

  static async regenerate(client: BotClient): Promise<IArcadeScheduleDoc> {
    return this.createWeek(client, weekDays(new Date()), true);
  }

  /** Lignes Lundi → Dimanche de la semaine courante, prêtes à afficher. */
  static async buildCurrentWeekLines(client: BotClient): Promise<string[]> {
    const week = await this.getOrCreateWeek(client);
    const config = await GamesForumService.getConfig();
    return this.buildLines(config, weekDays(new Date()), week.days, toParisDayYMD(new Date()));
  }

  static async getCurrentWeek(): Promise<{ days: string[]; games: Record<string, ScheduledGame> }> {
    const days = weekDays(new Date());
    const doc = await ArcadeScheduleModel.findOne({ weekKey: days[0] });
    return { days, games: doc?.days ?? {} };
  }

  private static buildLines(config: GamesForumConfig, days: string[], games: Record<string, ScheduledGame>, today: string): string[] {
    const link = (game: ScheduledGame) => {
      const threadId = config[THREAD_KEYS[game]];
      return threadId ? `<#${threadId}>` : `**${GAME_LABELS[game]}**`;
    };
    return days.map((d, i) => {
      if (d < today) return `~~${DAY_LABELS[i]}~~`;
      const day = d === today ? `**${DAY_LABELS[i]}** ◀` : DAY_LABELS[i];
      const game = games[d] ? `${GAME_LABELS[games[d]].split(' ')[0]} ${link(games[d])}  ·  ${GAME_HOURS[games[d]]}` : '*repos*';
      return `${day}  ·  ${game}`;
    });
  }

  private static buildAnnounce(config: GamesForumConfig, days: string[], games: Record<string, ScheduledGame>, today: string): ContainerBuilder {
    const lines = this.buildLines(config, days, games, today);
    const [first, last] = [days[0], days[6]].map((d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: PARIS_TZ }));

    return new ContainerBuilder()
      .setAccentColor(ACCENT_COLOR)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 📅 Planning des jeux\n-# Semaine du ${first} au ${last}`))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Un jeu par jour, rendez-vous dans le forum 🗂️ · réagis 🔔 sur un post pour être notifié'));
  }

  /**
   * Planifie du jour courant au dimanche, les jours déjà passés restent vides.
   * Le lundi, c'est le récap hebdo qui affiche le planning ; l'annonce dédiée ne sert qu'au regenerate.
   */
  private static async createWeek(client: BotClient, days: string[], announce = false): Promise<IArcadeScheduleDoc> {
    const previous = await ArcadeScheduleModel.findOne({ weekKey: days[0] });
    await GamesForumService.deleteAnnounce(client, previous?.announceMessageId, previous?.announceChannelId);

    const config = await GamesForumService.getConfig();
    const today = toParisDayYMD(new Date());
    const games = generateWeek(days.slice(days.indexOf(today)));
    const announceMessageId = announce
      ? await GamesForumService.announce(client, {
        components: [this.buildAnnounce(config, days, games, today)],
        flags: MessageFlags.IsComponentsV2,
      }, config.scheduleChannelId)
      : null;
    LogService.info(
      days.map((d, i) => `**${DAY_LABELS[i]}** · ${games[d] ? GAME_LABELS[games[d]] : '—'}`).join('\n'),
      { feature: '🕹️ Arcade', title: '📅 Planning de la semaine' },
    ).catch(() => {});

    return ArcadeScheduleModel.findOneAndUpdate(
      { weekKey: days[0] },
      { $set: { days: games, announceMessageId: announceMessageId ?? undefined, announceChannelId: config.scheduleChannelId ?? undefined } },
      { upsert: true, new: true },
    );
  }
}

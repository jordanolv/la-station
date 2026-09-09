import { ContainerBuilder, MessageFlags, SeparatorBuilder, TextDisplayBuilder } from 'discord.js';
import { BotClient } from '../../bot/client';
import { GameResultRepository } from '../../features/arcade/results/repositories/game-result.repository';
import { GamesForumService } from '../../features/discord/services/games-forum.service';
import { ArcadeScheduleService } from '../../features/arcade/schedule/services/arcade-schedule.service';
import { PARIS_TZ } from '../time/day-split';
import { LogService } from '../logs/logs.service';

export interface ActivityScore {
  userId: string;
  points: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const GAME_EMOJI: Record<string, string> = { bingo: '🎯', justePrix: '💰', avalanche: '🏔️', enigme: '🧩' };
const ACCENT_COLOR = 0xdac1ff;

const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: PARIS_TZ });

/** Message unique du lundi : top activité, champions des jeux, planning de la semaine. */
export class WeeklyRecapService {
  static async post(client: BotClient, activity: ActivityScore[]): Promise<void> {
    const now = new Date();
    const lastMonday = new Date(now.getTime() - 7 * 86_400_000);
    const nextSunday = new Date(now.getTime() + 6 * 86_400_000);

    const [champions, scheduleLines] = await Promise.all([
      GameResultRepository.championsBetween(lastMonday, now),
      ArcadeScheduleService.buildCurrentWeekLines(client),
    ]);

    const activityLines = activity.slice(0, 3).map((s, i) => `${MEDALS[i]} <@${s.userId}> — **${s.points.toLocaleString('fr-FR')}** pts`);
    const championLines = champions.top.map((c, i) => {
      const games = Object.entries(GAME_EMOJI).map(([game, emoji]) => emoji.repeat(c.byGame[game as keyof typeof c.byGame] ?? 0)).join('');
      return `${MEDALS[i]} <@${c.userId}> — **${c.wins}** victoire${c.wins > 1 ? 's' : ''} · ${games}`;
    });

    const container = new ContainerBuilder()
      .setAccentColor(ACCENT_COLOR)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `# 🗞️ La semaine à La Station\n-# Récap du ${fmtDate(lastMonday)} au ${fmtDate(new Date(now.getTime() - 86_400_000))} · programme jusqu'au ${fmtDate(nextSunday)}`,
      ))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        ['## 🏆 Activité de la semaine', ...(activityLines.length ? activityLines : ['*Personne n\'a été actif cette semaine…*']), '-# Voc et messages confondus · les rôles d\'activité viennent d\'être mis à jour'].join('\n'),
      ))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        ['## 🎮 Champions des jeux', ...(championLines.length ? championLines : ['*Aucune victoire cette semaine…*']), `-# ${champions.total} partie${champions.total > 1 ? 's' : ''} remportée${champions.total > 1 ? 's' : ''} cette semaine`].join('\n'),
      ))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(['## 📅 Planning de la semaine', ...scheduleLines].join('\n')))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Un jeu par jour, rendez-vous dans le forum 🗂️ · réagis 🔔 sur un post pour être notifié · bonne semaine ! 🎉'));

    const config = await GamesForumService.getConfig();
    await GamesForumService.announce(client, { components: [container], flags: MessageFlags.IsComponentsV2 }, config.scheduleChannelId);

    LogService.info(
      [`**Activité** : ${activityLines.join(' · ') || 'aucune'}`, `**Jeux** : ${championLines.join(' · ') || 'aucune victoire'}`].join('\n'),
      { feature: '🗞️ Récap hebdo', title: '📅 Lundi' },
    ).catch(() => {});
  }
}

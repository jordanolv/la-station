import { ContainerBuilder, MessageFlags, SeparatorBuilder, TextDisplayBuilder } from 'discord.js';
import { BotClient } from '../../bot/client';
import { GameResultRepository } from '../../features/arcade/results/repositories/game-result.repository';
import { GamesForumService } from '../../features/discord/services/games-forum.service';
import { ArcadeScheduleService, weekDays } from '../../features/arcade/schedule/services/arcade-schedule.service';
import { getGuildId } from '../guild';
import { PARIS_TZ, parisMidnightUTC } from '../time/day-split';
import { LogService } from '../logs/logs.service';

export interface ActivityScore {
  userId: string;
  points: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const GAME_EMOJI: Record<string, string> = { bingo: '🎯', justePrix: '💰', avalanche: '🏔️', enigme: '🧩' };
const ACCENT_COLOR = 0xdac1ff;
const SCHEDULE_ACCENT_COLOR = 0xf4a261;

const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: PARIS_TZ });

/** Message unique du lundi : top activité, champions des jeux, planning de la semaine. */
export class WeeklyRecapService {
  static async post(client: BotClient, activity: ActivityScore[]): Promise<void> {
    const now = new Date();
    const thisWeek = weekDays(now).map(parisMidnightUTC);
    const lastMonday = new Date(thisWeek[0].getTime() - 7 * 86_400_000);
    const lastSunday = new Date(thisWeek[0].getTime() - 86_400_000);
    const thisMonday = thisWeek[0];
    const thisSunday = thisWeek[6];

    const [champions, scheduleLines] = await Promise.all([
      GameResultRepository.championsBetween(lastMonday, thisMonday),
      ArcadeScheduleService.buildCurrentWeekLines(client),
    ]);

    const activityLines = activity.slice(0, 3).map((s, i) => `${MEDALS[i]} <@${s.userId}> — **${s.points.toLocaleString('fr-FR')}** pts`);
    const championLines = champions.top.map((c, i) => {
      const games = Object.entries(GAME_EMOJI).map(([game, emoji]) => emoji.repeat(c.byGame[game as keyof typeof c.byGame] ?? 0)).join('');
      return `${MEDALS[i]} <@${c.userId}> — **${c.wins}** victoire${c.wins > 1 ? 's' : ''} · ${games}`;
    });

    const guildName = client.guilds.cache.get(getGuildId())?.name ?? 'le serveur';

    const lastWeek = new ContainerBuilder()
      .setAccentColor(ACCENT_COLOR)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `# 🗞️ La semaine passée sur ${guildName}\n-# Du ${fmtDate(lastMonday)} au ${fmtDate(lastSunday)}`,
      ))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        ['## 🏆 Activité de la semaine', ...(activityLines.length ? activityLines : ['*Personne n\'a été actif cette semaine…*']), '-# Voc et messages confondus · les rôles d\'activité viennent d\'être mis à jour'].join('\n'),
      ))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        ['## 🎮 Champions des jeux', ...(championLines.length ? championLines : ['*Aucune victoire cette semaine…*']), `-# ${champions.total} partie${champions.total > 1 ? 's' : ''} remportée${champions.total > 1 ? 's' : ''} cette semaine`].join('\n'),
      ));

    const schedule = new ContainerBuilder()
      .setAccentColor(SCHEDULE_ACCENT_COLOR)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `# 📅 La semaine qui arrive\n-# Du ${fmtDate(thisMonday)} au ${fmtDate(thisSunday)}`,
      ))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(scheduleLines.join('\n')))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Un jeu par jour, rendez-vous dans le forum 🗂️ · réagis 🔔 sur un post pour être notifié · bonne semaine ! 🎉'));

    const config = await GamesForumService.getConfig();
    await GamesForumService.announce(client, { components: [lastWeek, schedule], flags: MessageFlags.IsComponentsV2 }, config.scheduleChannelId);

    LogService.info(
      [`**Activité** : ${activityLines.join(' · ') || 'aucune'}`, `**Jeux** : ${championLines.join(' · ') || 'aucune victoire'}`].join('\n'),
      { feature: '🗞️ Récap hebdo', title: '📅 Lundi' },
    ).catch(() => {});
  }
}

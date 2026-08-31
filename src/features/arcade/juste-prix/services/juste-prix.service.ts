import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  Message,
  MessageFlags,
  ThreadChannel,
} from 'discord.js';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { BotClient } from '../../../../bot/client';
import { getGuildId } from '../../../../shared/guild';
import { LogService } from '../../../../shared/logs/logs.service';
import { GamesForumService } from '../../../discord/services/games-forum.service';
import { AppConfigService } from '../../../discord/services/app-config.service';
import { UserService } from '../../../user/services/user.service';
import { LevelingService } from '../../../leveling/services/leveling.service';
import { awardExpeditions } from '../../../peak-hunters/services/expedition.service';
import { ArcadeStatsService } from '../../services/arcade-stats.service';
import { JustePrixRepository } from '../repositories/juste-prix.repository';
import type { IJustePrixStateDoc } from '../models/juste-prix-state.model';
import {
  JP_ACCENT_COLOR,
  JP_EXACT_BONUS_EXPEDITIONS,
  JP_FINISHED_ACCENT_COLOR,
  JP_HOUR_END,
  JP_HOUR_START,
  JP_NUMBER_MAX,
  JP_NUMBER_MIN,
  JP_REVEAL_HOUR,
  JP_REWARD_CLOSEST,
  JP_SPAWN_CHANCE,
} from '../constants/juste-prix.constants';

const TZ = 'Europe/Paris';
const LOG_FEATURE = '💰 Juste Prix';

function generateSpawnDate(): Date {
  const nowParis = toZonedTime(new Date(), TZ);
  const hourRange = JP_HOUR_END - JP_HOUR_START;
  const hour = JP_HOUR_START + Math.floor(Math.random() * (hourRange + 1));
  const naive = new Date(nowParis.getFullYear(), nowParis.getMonth(), nowParis.getDate(), hour, Math.floor(Math.random() * 60), 0);
  return fromZonedTime(naive, TZ);
}

function todayRevealDate(): Date {
  const nowParis = toZonedTime(new Date(), TZ);
  const naive = new Date(nowParis.getFullYear(), nowParis.getMonth(), nowParis.getDate(), JP_REVEAL_HOUR, 0, 0);
  return fromZonedTime(naive, TZ);
}

export class JustePrixService {
  private static async isEnabled(): Promise<boolean> {
    const appConfig = await AppConfigService.getOrCreateConfig();
    return (appConfig.features.arcade as any)?.justePrix?.enabled ?? true;
  }

  private static buildSpawnContainer(endsAt: Date): ContainerBuilder {
    const unix = Math.floor(endsAt.getTime() / 1000);
    return new ContainerBuilder()
      .setAccentColor(JP_ACCENT_COLOR)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 💰 LE JUSTE PRIX'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        [
          `Un nombre mystère entre **${JP_NUMBER_MIN}** et **${JP_NUMBER_MAX}** a été tiré.`,
          '',
          '**Règles :**',
          '• Propose **UN SEUL** nombre dans le fil — le renvoyer remplace ta proposition',
          `• Révélation <t:${unix}:R> (<t:${unix}:t>)`,
          '• **Le plus proche gagne** — tomber juste double la mise !',
          '',
          `🏆 Le plus proche : **${JP_REWARD_CLOSEST.money}** 💰 · **${JP_REWARD_CLOSEST.xp}** XP · **${JP_REWARD_CLOSEST.expeditions}** pack`,
          `🎯 Nombre exact : **+${JP_EXACT_BONUS_EXPEDITIONS}** packs bonus !`,
        ].join('\n'),
      ));
  }

  private static buildResultContainer(state: IJustePrixStateDoc, ranking: { userId: string; value: number; diff: number }[]): ContainerBuilder {
    const target = state.activeTarget!;
    const winner = ranking[0];
    const container = new ContainerBuilder()
      .setAccentColor(JP_FINISHED_ACCENT_COLOR)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 💰 JUSTE PRIX — RÉSULTAT'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    if (!winner) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `Le nombre mystère était **${target}**… mais personne n'a joué ! 😢`,
      ));
      return container;
    }

    const podium = ranking.slice(0, 3).map((r, i) =>
      `${['🥇', '🥈', '🥉'][i]} <@${r.userId}> — **${r.value}** (à ${r.diff === 0 ? '🎯 EXACT' : r.diff + ' près'})`);

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      [
        `Le nombre mystère était **${target}** !`,
        '',
        ...podium,
        '',
        `👥 ${ranking.length} participant${ranking.length > 1 ? 's' : ''}`,
      ].join('\n'),
    ));
    return container;
  }

  static async planDay(client: BotClient): Promise<void> {
    const state = await JustePrixRepository.getOrCreate();

    if (state.activeThreadId) {
      // Manche de la veille jamais résolue (bot down à 21h) : on résout maintenant
      await this.resolve(client);
    }
    if (state.nextSpawnAt && state.nextSpawnAt.getTime() > Date.now()) return;

    if (Math.random() >= JP_SPAWN_CHANCE) {
      LogService.info("Pas de Juste Prix aujourd'hui (tirage).", {
        feature: LOG_FEATURE,
        title: '🗓️ Planification du jour',
      }).catch(() => {});
      return;
    }

    const nextSpawnAt = generateSpawnDate();
    await JustePrixRepository.setNextSpawn(nextSpawnAt);
    this.scheduleTimer(client, nextSpawnAt, () => this.spawn(client));

    const unix = Math.floor(nextSpawnAt.getTime() / 1000);
    LogService.info(`Juste Prix programmé <t:${unix}:T> (<t:${unix}:R>)`, {
      feature: LOG_FEATURE,
      title: '🗓️ Planification du jour',
    }).catch(() => {});
  }

  static async rehydrate(client: BotClient): Promise<void> {
    const state = await JustePrixRepository.get();
    if (!state) return;

    if (state.activeThreadId && state.activeEndsAt) {
      const remaining = state.activeEndsAt.getTime() - Date.now();
      if (remaining <= 0) await this.resolve(client);
      else this.scheduleTimer(client, state.activeEndsAt, () => this.resolve(client));
      return;
    }

    if (state.nextSpawnAt) {
      if (state.nextSpawnAt.getTime() <= Date.now()) await this.spawn(client);
      else this.scheduleTimer(client, state.nextSpawnAt, () => this.spawn(client));
    }
  }

  private static scheduleTimer(client: BotClient, date: Date, action: () => Promise<void>): void {
    const delay = Math.max(date.getTime() - Date.now(), 0);
    setTimeout(() => {
      action().catch((err) => console.error('[JustePrix] timer error:', err));
    }, delay);
  }

  static async spawn(client: BotClient): Promise<void> {
    if (!(await this.isEnabled())) {
      await JustePrixRepository.setNextSpawn(null);
      return;
    }

    const state = await JustePrixRepository.getOrCreate();
    if (state.activeThreadId) return;

    const forumConfig = await GamesForumService.getConfig();
    if (!forumConfig.justePrixThreadId) {
      LogService.warning('Post forum 💰 Juste Prix non configuré, manche annulée (configure le forum des jeux).', {
        feature: LOG_FEATURE,
        title: '⚠️ Spawn annulé',
      }).catch(() => {});
      await JustePrixRepository.setNextSpawn(null);
      return;
    }

    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    const post = guild ? await guild.channels.fetch(forumConfig.justePrixThreadId).catch(() => null) : null;
    if (!post?.isThread()) {
      await JustePrixRepository.setNextSpawn(null);
      return;
    }

    const endsAt = todayRevealDate();
    if (endsAt.getTime() <= Date.now()) {
      await JustePrixRepository.setNextSpawn(null);
      return;
    }

    const target = JP_NUMBER_MIN + Math.floor(Math.random() * (JP_NUMBER_MAX - JP_NUMBER_MIN + 1));
    await GamesForumService.setThreadLocked(client, post.id, false);
    const message = await post.send({
      components: [this.buildSpawnContainer(endsAt)],
      flags: MessageFlags.IsComponentsV2,
    });
    await GamesForumService.pingInThread(post as ThreadChannel, `Une manche du Juste Prix démarre — un nombre entre ${JP_NUMBER_MIN} et ${JP_NUMBER_MAX}, révélation à ${JP_REVEAL_HOUR}h !`);
    const announceMessageId = await GamesForumService.announce(
      client,
      `💰 **Le Juste Prix est lancé !** Propose ton nombre avant ${JP_REVEAL_HOUR}h → <#${post.id}>`,
    );

    await JustePrixRepository.setActive({
      threadId: post.id,
      messageId: message.id,
      target,
      endsAt,
      announceMessageId,
    });
    this.scheduleTimer(client, endsAt, () => this.resolve(client));

    LogService.info(`Juste Prix lancé dans <#${post.id}> (cible ${target}, révélation ${JP_REVEAL_HOUR}h)`, {
      feature: LOG_FEATURE,
      title: '💰 Spawn',
    }).catch(() => {});
  }

  static async handleMessage(message: Message, _client: BotClient): Promise<void> {
    if (message.author.bot) return;
    if (!message.channel.isThread()) return;

    const state = await JustePrixRepository.get();
    if (!state?.activeThreadId || !state.activeTarget) return;
    if (message.channel.id !== state.activeThreadId) return;
    if (state.activeEndsAt && state.activeEndsAt.getTime() <= Date.now()) return;

    const num = Number(message.content.trim());
    if (!Number.isInteger(num) || num < JP_NUMBER_MIN || num > JP_NUMBER_MAX) return;

    const isUpdate = Boolean(state.guesses?.[message.author.id]);
    await JustePrixRepository.setGuess(message.author.id, num);
    if (!isUpdate) await UserService.recordArcadeAttempt(message.author.id, 'justePrix' as any);
    await message.react(isUpdate ? '🔄' : '✅').catch(() => {});
  }

  static async resolve(client: BotClient): Promise<void> {
    const state = await JustePrixRepository.get();
    if (!state?.activeThreadId || !state.activeTarget) return;

    const target = state.activeTarget;
    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    const thread = guild ? await guild.channels.fetch(state.activeThreadId).catch(() => null) : null;

    const ranking = Object.entries(state.guesses ?? {})
      .map(([userId, g]) => ({ userId, value: g.value, at: new Date(g.at).getTime(), diff: Math.abs(g.value - target) }))
      .sort((a, b) => a.diff - b.diff || a.at - b.at);

    const winner = ranking[0];

    if (thread?.isThread()) {
      if (state.activeMessageId) {
        const mainMessage = await thread.messages.fetch(state.activeMessageId).catch(() => null);
        await mainMessage?.edit({
          components: [this.buildResultContainer(state, ranking)],
          flags: MessageFlags.IsComponentsV2,
        }).catch(() => {});
      }

      if (winner) {
        const exact = winner.diff === 0;
        const packs = JP_REWARD_CLOSEST.expeditions + (exact ? JP_EXACT_BONUS_EXPEDITIONS : 0);
        await UserService.updateUserMoney(winner.userId, JP_REWARD_CLOSEST.money);
        await LevelingService.giveXpDirectly(client, winner.userId, JP_REWARD_CLOSEST.xp);
        const expeditions = await awardExpeditions(winner.userId, packs);
        await UserService.recordArcadeWin(winner.userId, 'justePrix' as any);
        await ArcadeStatsService.incrementTotalGames('justePrix');

        await thread.send({
          content: [
            exact
              ? `🎯 **INCROYABLE !** <@${winner.userId}> a trouvé le nombre EXACT : **${target}** !`
              : `💰 **RÉVÉLATION !** Le nombre était **${target}** — <@${winner.userId}> gagne avec **${winner.value}** (à ${winner.diff} près) !`,
            `🏆 +**${JP_REWARD_CLOSEST.money}** 💰 · +**${JP_REWARD_CLOSEST.xp}** XP · +**${packs}** pack${packs > 1 ? 's' : ''} ${expeditions.summary}`,
          ].join('\n'),
        }).catch(() => {});

        LogService.success(
          `<@${winner.userId}> gagne le Juste Prix (cible **${target}**, proposé **${winner.value}**)${exact ? ' — EXACT 🎯' : ''}`,
          { feature: LOG_FEATURE, title: '🏆 Gagnant' },
        ).catch(() => {});
      } else {
        await thread.send(`💨 Le nombre était **${target}**… mais personne n'a joué cette fois !`).catch(() => {});
      }
    }

    if (thread?.isThread()) {
      await thread.setLocked(true).catch(() => {});
    }
    await GamesForumService.deleteAnnounce(client, state.announceMessageId);
    await JustePrixRepository.clearActive();
  }
}

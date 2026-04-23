import {
  Message,
  TextChannel,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  ThreadChannel,
} from 'discord.js';
import { BotClient } from '../../../../bot/client';
import { getGuildId } from '../../../../shared/guild';
import { AppConfigService } from '../../../discord/services/app-config.service';
import { UserService } from '../../../user/services/user.service';
import { LevelingService } from '../../../leveling/services/leveling.service';
import { awardExpeditions } from '../../../peak-hunters/services/expedition.service';
import { LogService } from '../../../../shared/logs/logs.service';
import { BingoRepository } from '../repositories/bingo.repository';
import type { IBingoStateDoc } from '../models/bingo-state.model';
import {
  BINGO_ACCENT_COLOR,
  BINGO_FINISHED_ACCENT_COLOR,
  BINGO_NUMBER_MAX,
  BINGO_NUMBER_MIN,
  BINGO_REWARD,
  BINGO_SPAWN_CHANCE,
  BINGO_THREAD_AUTO_ARCHIVE_MINUTES,
  BINGO_THREAD_SLOWMODE_SECONDS,
} from '../constants/bingo.constants';
import { generateBingoDate } from '../utils/bingo-date.utils';

const LOG_FEATURE = '🎯 Bingo';

export class BingoService {
  private static buildSpawnContainer(): ContainerBuilder {
    return new ContainerBuilder()
      .setAccentColor(BINGO_ACCENT_COLOR)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 🎯 C\'EST L\'HEURE DU BINGO !'),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Devinez le nombre entre **${BINGO_NUMBER_MIN}** et **${BINGO_NUMBER_MAX}** dans le fil ci-dessous !`,
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '**Règles :**',
            `• Réponds avec un nombre entre ${BINGO_NUMBER_MIN} et ${BINGO_NUMBER_MAX} dans le fil`,
            '• Pas deux réponses d\'affilée (attends qu\'un autre joueur tente)',
            `• Cooldown de ${Math.floor(BINGO_THREAD_SLOWMODE_SECONDS / 60)} minutes entre chaque réponse`,
          ].join('\n'),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🏆 Récompense : **${BINGO_REWARD.money}** 💰 · **${BINGO_REWARD.xp}** XP · **${BINGO_REWARD.expeditions}** pack(s)`,
        ),
      );
  }

  private static buildFinishedContainer(winnerId: string, target: number, guessCount: number): ContainerBuilder {
    return new ContainerBuilder()
      .setAccentColor(BINGO_FINISHED_ACCENT_COLOR)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# ✅ BINGO TERMINÉ'),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `🏆 Gagnant : <@${winnerId}>`,
            `🔢 Nombre à trouver : **${target}**`,
            `🎲 Trouvé en : **${guessCount}** coup${guessCount > 1 ? 's' : ''}`,
          ].join('\n'),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Récompense remportée : **${BINGO_REWARD.money}** 💰 · **${BINGO_REWARD.xp}** XP · **${BINGO_REWARD.expeditions}** pack(s)`,
        ),
      );
  }

  static async planDay(client: BotClient): Promise<void> {
    const state = await BingoRepository.getOrCreate();

    if (state.activeThreadId) return;
    if (state.nextSpawnAt && state.nextSpawnAt.getTime() > Date.now()) return;

    if (Math.random() >= BINGO_SPAWN_CHANCE) {
      LogService.info("Pas de bingo aujourd'hui (tirage).", {
        feature: LOG_FEATURE,
        title: '🗓️ Planification du jour',
      }).catch(() => {});
      return;
    }

    const nextSpawnAt = generateBingoDate();
    await BingoRepository.setNextSpawn(nextSpawnAt);
    this.scheduleTimer(client, nextSpawnAt);

    const unix = Math.floor(nextSpawnAt.getTime() / 1000);
    LogService.info(`Bingo programmé <t:${unix}:T> (<t:${unix}:R>)`, {
      feature: LOG_FEATURE,
      title: '🗓️ Planification du jour',
    }).catch(() => {});
  }

  static async rehydrate(client: BotClient): Promise<void> {
    const state = await BingoRepository.get();
    if (!state?.nextSpawnAt) return;

    const ts = state.nextSpawnAt.getTime();
    if (ts <= Date.now()) {
      if (!state.activeThreadId) {
        await this.spawn(client);
      }
      return;
    }

    this.scheduleTimer(client, state.nextSpawnAt);
    const unix = Math.floor(ts / 1000);
    LogService.info(`Bingo réhydraté <t:${unix}:T> (<t:${unix}:R>)`, {
      feature: LOG_FEATURE,
      title: '🔄 Réhydratation',
    }).catch(() => {});
  }

  private static scheduleTimer(client: BotClient, date: Date): void {
    const delay = date.getTime() - Date.now();
    if (delay <= 0) {
      this.spawn(client).catch(() => {});
      return;
    }
    setTimeout(() => {
      this.spawn(client).catch((err) => console.error('[Bingo] spawn error:', err));
    }, delay);
  }

  static async spawn(client: BotClient): Promise<void> {
    const appConfig = await AppConfigService.getOrCreateConfig();
    const isEnabled = appConfig.features.arcade?.bingo?.enabled ?? true;
    const channelId = appConfig.config.channels?.arcade;

    if (!isEnabled) {
      LogService.info('Bingo désactivé dans la configuration, spawn ignoré.', {
        feature: LOG_FEATURE,
        title: '⏸️ Spawn ignoré',
      }).catch(() => {});
      await BingoRepository.setNextSpawn(null);
      return;
    }

    if (!channelId) {
      LogService.warning('Aucun salon arcade configuré, bingo annulé.', {
        feature: LOG_FEATURE,
        title: '⚠️ Spawn annulé',
      }).catch(() => {});
      await BingoRepository.setNextSpawn(null);
      return;
    }

    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    if (!guild) {
      LogService.warning('Guild introuvable, bingo annulé.', {
        feature: LOG_FEATURE,
        title: '⚠️ Spawn annulé',
      }).catch(() => {});
      return;
    }

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased() || channel.isThread()) {
      LogService.warning(`Salon arcade invalide ou introuvable (${channelId}), bingo annulé.`, {
        feature: LOG_FEATURE,
        title: '⚠️ Spawn annulé',
      }).catch(() => {});
      return;
    }

    const target = Math.floor(Math.random() * BINGO_NUMBER_MAX) + BINGO_NUMBER_MIN;

    const message = await (channel as TextChannel).send({
      components: [this.buildSpawnContainer()],
      flags: MessageFlags.IsComponentsV2,
    });

    let thread: ThreadChannel;
    try {
      thread = await message.startThread({
        name: '🎯 Bingo — trouvez le nombre !',
        autoArchiveDuration: BINGO_THREAD_AUTO_ARCHIVE_MINUTES,
        rateLimitPerUser: BINGO_THREAD_SLOWMODE_SECONDS,
      });
      await thread.send(
        `🎯 **Devinez le nombre entre ${BINGO_NUMBER_MIN} et ${BINGO_NUMBER_MAX}.** Bonne chance !`,
      );
    } catch (err) {
      console.error('[Bingo] startThread error:', err);
      await message.delete().catch(() => {});
      return;
    }

    await BingoRepository.setActive({
      channelId: channel.id,
      messageId: message.id,
      threadId: thread.id,
      target,
      startedAt: new Date(),
    });

    LogService.info(`Bingo lancé dans <#${channel.id}> — cible : **${target}**`, {
      feature: LOG_FEATURE,
      title: '🎯 Spawn',
    }).catch(() => {});
  }

  static async handleMessage(message: Message, client: BotClient): Promise<void> {
    if (message.author.bot) return;
    if (!message.channel.isThread()) return;

    const state = await BingoRepository.get();
    if (!state?.activeThreadId || !state.activeTarget) return;
    if (message.channel.id !== state.activeThreadId) return;

    const content = message.content.trim();
    const num = Number(content);
    if (!Number.isInteger(num) || num < BINGO_NUMBER_MIN || num > BINGO_NUMBER_MAX) return;

    if (state.activeLastGuesserId === message.author.id) {
      await message.reply({
        content: '⏳ Pas deux réponses d\'affilée ! Laisse un autre joueur tenter sa chance.',
      }).catch(() => {});
      return;
    }

    const isDuplicateGuess = state.activeGuesses?.includes(num) ?? false;
    const updatedState = await BingoRepository.registerGuess(message.author.id, num);
    const guessCount = updatedState?.activeGuesses?.length ?? (state.activeGuesses?.length ?? 0) + 1;

    if (num === state.activeTarget) {
      await this.handleWin(message, client, state, guessCount);
      return;
    }

    await message.react(isDuplicateGuess ? '🔁' : '❌').catch(() => {});
  }

  private static async handleWin(
    message: Message,
    client: BotClient,
    state: IBingoStateDoc,
    guessCount: number,
  ): Promise<void> {
    const user = message.author;
    const target = state.activeTarget;
    if (!target) return;

    await UserService.updateUserMoney(user.id, BINGO_REWARD.money);
    await LevelingService.giveXpDirectly(client, user.id, BINGO_REWARD.xp);
    const expeditions = await awardExpeditions(user.id, BINGO_REWARD.expeditions);
    await UserService.recordArcadeWin(user.id, 'bingo' as any);

    const appConfig = await AppConfigService.getOrCreateConfig();
    if (appConfig.features.arcade?.bingo) {
      appConfig.features.arcade.bingo.stats.totalGames += 1;
      await appConfig.save();
    }

    await this.updateMainMessage(message, state, user.id, target, guessCount);

    await message.reply({
      content: [
        `🎉 **BINGO !** <@${user.id}> a trouvé le nombre **${target}** en **${guessCount}** coup${guessCount > 1 ? 's' : ''} !`,
        `🏆 +**${BINGO_REWARD.money}** 💰 · +**${BINGO_REWARD.xp}** XP · +**${BINGO_REWARD.expeditions}** pack(s) ${expeditions.summary}`,
      ].join('\n'),
    }).catch(() => {});

    const thread = message.channel as ThreadChannel;
    await thread.setLocked(true).catch(() => {});
    await thread.setArchived(true).catch(() => {});

    await BingoRepository.clearActive();

    LogService.success(
      `<@${user.id}> a gagné le bingo (cible **${target}**, **${guessCount}** coup${guessCount > 1 ? 's' : ''}) — +${BINGO_REWARD.money} 💰 · +${BINGO_REWARD.xp} XP · ${expeditions.summary}`,
      { feature: LOG_FEATURE, title: '🏆 Gagnant' },
    ).catch(() => {});
  }

  private static async updateMainMessage(
    message: Message,
    state: IBingoStateDoc,
    winnerId: string,
    target: number,
    guessCount: number,
  ): Promise<void> {
    if (!state.activeMessageId) return;

    const thread = message.channel;
    if (!thread.isThread()) return;

    const parent = thread?.parent;
    if (!parent || !parent.isTextBased() || parent.isThread()) return;

    const starterMessage = await parent.messages.fetch(state.activeMessageId).catch(() => null);
    if (!starterMessage) return;

    await starterMessage.edit({
      components: [this.buildFinishedContainer(winnerId, target, guessCount)],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => {});
  }
}

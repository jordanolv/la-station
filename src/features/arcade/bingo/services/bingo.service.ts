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
import {
  BINGO_ACCENT_COLOR,
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
    if (!appConfig.features.arcade?.bingo?.enabled) {
      await BingoRepository.setNextSpawn(null);
      return;
    }

    const channelId = appConfig.config.channels?.arcade;
    if (!channelId) {
      LogService.warning('Aucun salon arcade configuré, bingo annulé.', {
        feature: LOG_FEATURE,
        title: '⚠️ Spawn annulé',
      }).catch(() => {});
      await BingoRepository.setNextSpawn(null);
      return;
    }

    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    if (!guild) return;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased() || channel.isThread()) return;

    const target = Math.floor(Math.random() * BINGO_NUMBER_MAX) + BINGO_NUMBER_MIN;

    const container = new ContainerBuilder()
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
            '• Réponds avec un nombre entre 1 et 100 dans le fil',
            '• Pas deux réponses d\'affilée (attends qu\'un autre joueur tente)',
            '• Cooldown de 5 minutes entre chaque réponse',
          ].join('\n'),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🏆 Récompense : **${BINGO_REWARD.money}** 💰 · **${BINGO_REWARD.xp}** XP · **${BINGO_REWARD.expeditions}** expédition(s)`,
        ),
      );

    const message = await (channel as TextChannel).send({
      components: [container],
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

    if (num === state.activeTarget) {
      await this.handleWin(message, client, state.activeTarget);
      return;
    }

    await BingoRepository.setLastGuesser(message.author.id);
  }

  private static async handleWin(
    message: Message,
    client: BotClient,
    target: number,
  ): Promise<void> {
    const user = message.author;

    await UserService.updateUserMoney(user.id, BINGO_REWARD.money);
    await LevelingService.giveXpDirectly(client, user.id, BINGO_REWARD.xp);
    const expeditions = await awardExpeditions(user.id, BINGO_REWARD.expeditions);
    await UserService.recordArcadeWin(user.id, 'bingo' as any);

    const appConfig = await AppConfigService.getOrCreateConfig();
    if (appConfig.features.arcade?.bingo) {
      appConfig.features.arcade.bingo.stats.totalGames += 1;
      await appConfig.save();
    }

    await message.reply({
      content: [
        `🎉 **BINGO !** <@${user.id}> a trouvé le nombre **${target}** !`,
        `🏆 +**${BINGO_REWARD.money}** 💰 · +**${BINGO_REWARD.xp}** XP · +**${BINGO_REWARD.expeditions}** expédition ${expeditions.summary}`,
      ].join('\n'),
    }).catch(() => {});

    const thread = message.channel as ThreadChannel;
    await thread.setLocked(true).catch(() => {});
    await thread.setArchived(true).catch(() => {});

    await BingoRepository.clearActive();

    LogService.success(
      `<@${user.id}> a gagné le bingo (cible **${target}**) — +${BINGO_REWARD.money} 💰 · +${BINGO_REWARD.xp} XP · ${expeditions.summary}`,
      { feature: LOG_FEATURE, title: '🏆 Gagnant' },
    ).catch(() => {});
  }
}

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
import { awardExpeditions, addFragmentsAndAward } from '../../../peak-hunters/services/expedition.service';
import { ArcadeStatsService } from '../../services/arcade-stats.service';
import { AvalancheRepository } from '../repositories/avalanche.repository';
import type { IAvalancheStateDoc } from '../models/avalanche-state.model';
import {
  AVALANCHE_ACCENT_COLOR,
  AVALANCHE_ELIMINATION_END_HOUR,
  AVALANCHE_ELIMINATION_START_HOUR,
  AVALANCHE_FINISHED_ACCENT_COLOR,
  AVALANCHE_MIN_PLAYERS,
  AVALANCHE_NUMBER_MAX,
  AVALANCHE_NUMBER_MIN,
  AVALANCHE_PARTICIPATION_FRAGMENTS,
  AVALANCHE_REGISTRATION_END_HOUR,
  AVALANCHE_REWARD,
  AVALANCHE_SPAWN_CHANCE,
} from '../constants/avalanche.constants';

const TZ = 'Europe/Paris';
const LOG_FEATURE = '🏔️ Avalanche';

function todayAtParis(hourFraction: number): Date {
  const nowParis = toZonedTime(new Date(), TZ);
  const hour = Math.floor(hourFraction);
  const minute = Math.round((hourFraction - hour) * 60);
  const naive = new Date(nowParis.getFullYear(), nowParis.getMonth(), nowParis.getDate(), hour, minute, 0);
  return fromZonedTime(naive, TZ);
}

function todayKeyParis(): string {
  const p = toZonedTime(new Date(), TZ);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}-${String(p.getDate()).padStart(2, '0')}`;
}

function survivorsOf(state: IAvalancheStateDoc): { userId: string; num: number }[] {
  const eliminated = new Set(state.eliminatedNumbers ?? []);
  return Object.entries(state.players ?? {})
    .map(([userId, num]) => ({ userId, num }))
    .filter((p) => !eliminated.has(p.num));
}

export class AvalancheService {
  private static async isEnabled(): Promise<boolean> {
    const appConfig = await AppConfigService.getOrCreateConfig();
    return (appConfig.features.arcade as any)?.avalanche?.enabled ?? true;
  }

  private static buildSpawnContainer(registrationEndsAt: Date): ContainerBuilder {
    const unix = Math.floor(registrationEndsAt.getTime() / 1000);
    return new ContainerBuilder()
      .setAccentColor(AVALANCHE_ACCENT_COLOR)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🏔️ L\'AVALANCHE'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        [
          `Prends ta position sur la montagne : un nombre entre **${AVALANCHE_NUMBER_MIN}** et **${AVALANCHE_NUMBER_MAX}**.`,
          '',
          '**Règles :**',
          '• Une position par grimpeur, premier arrivé premier servi — la renvoyer la change',
          `• Inscriptions ouvertes jusqu'à <t:${unix}:t> (<t:${unix}:R>)`,
          `• Ensuite l'avalanche gronde : elle emporte une position au hasard, régulièrement, jusqu'à ${AVALANCHE_ELIMINATION_END_HOUR}h`,
          '• **Le dernier grimpeur debout remporte tout !**',
          '',
          `🏆 Le survivant : **${AVALANCHE_REWARD.money}** 💰 · **${AVALANCHE_REWARD.xp}** XP · **${AVALANCHE_REWARD.expeditions}** packs`,
          `🤝 Les emportés repartent avec **${AVALANCHE_PARTICIPATION_FRAGMENTS}** fragments`,
        ].join('\n'),
      ));
  }

  private static buildFinishedContainer(winnerId: string, winnerNum: number, playerCount: number): ContainerBuilder {
    return new ContainerBuilder()
      .setAccentColor(AVALANCHE_FINISHED_ACCENT_COLOR)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🏔️ AVALANCHE — TERMINÉE'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        [
          `🏆 Dernier grimpeur debout : <@${winnerId}> (position **${winnerNum}**)`,
          `👥 ${playerCount} grimpeur${playerCount > 1 ? 's' : ''} au départ`,
          '',
          `Récompense : **${AVALANCHE_REWARD.money}** 💰 · **${AVALANCHE_REWARD.xp}** XP · **${AVALANCHE_REWARD.expeditions}** packs`,
        ].join('\n'),
      ));
  }

  static async planDay(client: BotClient): Promise<void> {
    const state = await AvalancheRepository.getOrCreate();
    if (state.activeThreadId) {
      await this.rehydrate(client);
      return;
    }

    const today = todayKeyParis();
    if (state.lastPlanDate === today) return;
    await AvalancheRepository.setLastPlanDate(today);

    if (Math.random() >= AVALANCHE_SPAWN_CHANCE) {
      LogService.info("Pas d'avalanche aujourd'hui (tirage).", {
        feature: LOG_FEATURE,
        title: '🗓️ Planification du jour',
      }).catch(() => {});
      return;
    }

    await this.spawn(client);
  }

  static async rehydrate(client: BotClient): Promise<void> {
    const state = await AvalancheRepository.get();
    if (!state?.activeThreadId) {
      await this.planDay(client);
      return;
    }

    if ((state.eliminationTimes ?? []).length === 0) {
      const endsAt = state.registrationEndsAt?.getTime() ?? 0;
      if (endsAt <= Date.now()) await this.closeRegistration(client);
      else this.scheduleTimer(state.registrationEndsAt!, () => this.closeRegistration(client));
      return;
    }

    this.scheduleNextElimination(client, state);
  }

  private static scheduleTimer(date: Date, action: () => Promise<void>): void {
    const delay = Math.max(date.getTime() - Date.now(), 0);
    setTimeout(() => {
      action().catch((err) => console.error('[Avalanche] timer error:', err));
    }, delay);
  }

  private static scheduleNextElimination(client: BotClient, state: IAvalancheStateDoc): void {
    const done = (state.eliminatedNumbers ?? []).length;
    const next = (state.eliminationTimes ?? [])[done];
    if (!next) return;
    this.scheduleTimer(new Date(next), () => this.runElimination(client));
  }

  static async spawn(client: BotClient): Promise<void> {
    if (!(await this.isEnabled())) return;

    const state = await AvalancheRepository.getOrCreate();
    if (state.activeThreadId) return;

    const registrationEndsAt = todayAtParis(AVALANCHE_REGISTRATION_END_HOUR);
    if (registrationEndsAt.getTime() <= Date.now()) return;

    const forumConfig = await GamesForumService.getConfig();
    if (!forumConfig.avalancheThreadId) {
      LogService.warning('Post forum 🏔️ Avalanche non configuré, partie annulée (configure le forum des jeux).', {
        feature: LOG_FEATURE,
        title: '⚠️ Spawn annulé',
      }).catch(() => {});
      return;
    }

    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    const post = guild ? await guild.channels.fetch(forumConfig.avalancheThreadId).catch(() => null) : null;
    if (!post?.isThread()) return;

    await GamesForumService.setThreadLocked(client, post.id, false);
    const message = await post.send({
      components: [this.buildSpawnContainer(registrationEndsAt)],
      flags: MessageFlags.IsComponentsV2,
    });
    await GamesForumService.pingInThread(
      post as ThreadChannel,
      'avalanche',
      `Une avalanche se prépare — prends ta position (${AVALANCHE_NUMBER_MIN}-${AVALANCHE_NUMBER_MAX}) avant ${AVALANCHE_REGISTRATION_END_HOUR}h !`,
    );
    const announceMessageId = await GamesForumService.announce(
      client,
      `🏔️ **L'Avalanche gronde !** Prends ta position avant ${AVALANCHE_REGISTRATION_END_HOUR}h, dernier debout à ${AVALANCHE_ELIMINATION_END_HOUR}h → <#${post.id}>`,
    );

    await AvalancheRepository.setActive({
      threadId: post.id,
      messageId: message.id,
      registrationEndsAt,
      announceMessageId,
    });
    this.scheduleTimer(registrationEndsAt, () => this.closeRegistration(client));

    LogService.info(`Avalanche lancée dans <#${post.id}> (clôture ${AVALANCHE_REGISTRATION_END_HOUR}h, fin ${AVALANCHE_ELIMINATION_END_HOUR}h)`, {
      feature: LOG_FEATURE,
      title: '🏔️ Spawn',
    }).catch(() => {});
  }

  static async handleMessage(message: Message, _client: BotClient): Promise<void> {
    if (message.author.bot) return;
    if (!message.channel.isThread()) return;

    const state = await AvalancheRepository.get();
    if (!state?.activeThreadId) return;
    if (message.channel.id !== state.activeThreadId) return;
    if ((state.eliminationTimes ?? []).length > 0) return;
    if (!state.registrationEndsAt || state.registrationEndsAt.getTime() <= Date.now()) return;

    const num = Number(message.content.trim());
    if (!Number.isInteger(num) || num < AVALANCHE_NUMBER_MIN || num > AVALANCHE_NUMBER_MAX) return;

    const taken = Object.entries(state.players ?? {}).some(([userId, n]) => userId !== message.author.id && n === num);
    if (taken) {
      await message.react('❌').catch(() => {});
      await message.reply({ content: `❌ La position **${num}** est déjà prise, choisis-en une autre !` }).catch(() => {});
      return;
    }

    const isUpdate = state.players?.[message.author.id] !== undefined;
    await AvalancheRepository.setPlayer(message.author.id, num);
    if (!isUpdate) await UserService.recordArcadeAttempt(message.author.id, 'avalanche');
    await message.react(isUpdate ? '🔁' : '✅').catch(() => {});
  }

  static async closeRegistration(client: BotClient): Promise<void> {
    const state = await AvalancheRepository.get();
    if (!state?.activeThreadId || (state.eliminationTimes ?? []).length > 0) return;

    const players = Object.entries(state.players ?? {});
    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    const thread = guild ? await guild.channels.fetch(state.activeThreadId).catch(() => null) : null;

    if (players.length < AVALANCHE_MIN_PLAYERS) {
      if (thread?.isThread()) {
        await thread.send(`🌫️ Pas assez de grimpeurs sur la montagne (**${players.length}**)… l'avalanche est reportée. À la prochaine !`).catch(() => {});
        await thread.setLocked(true).catch(() => {});
      }
      await GamesForumService.deleteAnnounce(client, state.announceMessageId);
      await AvalancheRepository.clearActive();
      LogService.info(`Avalanche annulée : ${players.length} inscrit(s) seulement.`, {
        feature: LOG_FEATURE,
        title: '🌫️ Annulée',
      }).catch(() => {});
      return;
    }

    const start = todayAtParis(AVALANCHE_ELIMINATION_START_HOUR).getTime();
    const end = todayAtParis(AVALANCHE_ELIMINATION_END_HOUR).getTime();
    const n = players.length - 1;
    const times: Date[] = n === 1
      ? [new Date(start)]
      : Array.from({ length: n }, (_, i) => new Date(start + (i * (end - start)) / (n - 1)));
    await AvalancheRepository.setEliminationTimes(times);

    if (thread?.isThread()) {
      const firstUnix = Math.floor(times[0].getTime() / 1000);
      const positions = players
        .sort((a, b) => a[1] - b[1])
        .map(([userId, num]) => `**${num}** — <@${userId}>`)
        .join(' · ');
      await thread.send({
        content: [
          `🔒 **Les inscriptions sont closes !** ${players.length} grimpeurs sur la montagne :`,
          positions,
          '',
          `🌨️ Première coulée <t:${firstUnix}:R> — le dernier debout à ${AVALANCHE_ELIMINATION_END_HOUR}h remporte tout !`,
        ].join('\n'),
        allowedMentions: { users: [] },
      }).catch(() => {});
    }

    const fresh = await AvalancheRepository.get();
    if (fresh) this.scheduleNextElimination(client, fresh);

    LogService.info(`Inscriptions closes : ${players.length} joueurs, ${n} élimination(s) jusqu'à ${AVALANCHE_ELIMINATION_END_HOUR}h.`, {
      feature: LOG_FEATURE,
      title: '🔒 Clôture',
    }).catch(() => {});
  }

  private static async runElimination(client: BotClient): Promise<void> {
    const state = await AvalancheRepository.get();
    if (!state?.activeThreadId || (state.eliminationTimes ?? []).length === 0) return;

    const survivors = survivorsOf(state);
    if (survivors.length <= 1) {
      await this.crown(client, state);
      return;
    }

    const victim = survivors[Math.floor(Math.random() * survivors.length)];
    await AvalancheRepository.addEliminated(victim.num);
    const remaining = survivors.length - 1;

    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    const thread = guild ? await guild.channels.fetch(state.activeThreadId).catch(() => null) : null;

    if (remaining === 1) {
      const winner = survivors.find((s) => s.num !== victim.num)!;
      if (thread?.isThread()) {
        await thread.send(
          `🌨️ L'avalanche emporte la position **${victim.num}**… <@${victim.userId}> dévale la pente ! 💀`,
        ).catch(() => {});
      }
      const fresh = await AvalancheRepository.get();
      await this.crown(client, fresh ?? state, winner);
      return;
    }

    if (thread?.isThread()) {
      await thread.send(
        `🌨️ L'avalanche emporte la position **${victim.num}**… <@${victim.userId}> dévale la pente ! 💀 Encore **${remaining}** grimpeurs debout.`,
      ).catch(() => {});
    }

    const fresh = await AvalancheRepository.get();
    if (fresh) this.scheduleNextElimination(client, fresh);
  }

  private static async crown(
    client: BotClient,
    state: IAvalancheStateDoc,
    winnerOverride?: { userId: string; num: number },
  ): Promise<void> {
    const winner = winnerOverride ?? survivorsOf(state)[0];
    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    const thread = state.activeThreadId
      ? await guild?.channels.fetch(state.activeThreadId).catch(() => null)
      : null;

    if (winner) {
      await UserService.updateUserMoney(winner.userId, AVALANCHE_REWARD.money);
      await LevelingService.giveXpDirectly(client, winner.userId, AVALANCHE_REWARD.xp);
      const expeditions = await awardExpeditions(winner.userId, AVALANCHE_REWARD.expeditions);
      await UserService.recordArcadeWin(winner.userId, 'avalanche');
      await ArcadeStatsService.incrementTotalGames('avalanche');

      const eliminated = Object.keys(state.players ?? {}).filter((id) => id !== winner.userId);
      for (const userId of eliminated) {
        await addFragmentsAndAward(userId, AVALANCHE_PARTICIPATION_FRAGMENTS).catch(() => {});
      }

      if (thread?.isThread()) {
        if (state.activeMessageId) {
          const mainMessage = await thread.messages.fetch(state.activeMessageId).catch(() => null);
          await mainMessage?.edit({
            components: [this.buildFinishedContainer(winner.userId, winner.num, Object.keys(state.players ?? {}).length)],
            flags: MessageFlags.IsComponentsV2,
          }).catch(() => {});
        }
        await thread.send({
          content: [
            `🏆 **L'AVALANCHE S'ARRÊTE !** <@${winner.userId}> est le dernier grimpeur debout avec la position **${winner.num}** !`,
            `🎉 +**${AVALANCHE_REWARD.money}** 💰 · +**${AVALANCHE_REWARD.xp}** XP · +**${AVALANCHE_REWARD.expeditions}** packs ${expeditions.summary}`,
            ...(eliminated.length > 0
              ? [`🤝 Les ${eliminated.length} emportés repartent avec **${AVALANCHE_PARTICIPATION_FRAGMENTS}** fragments chacun !`]
              : []),
          ].join('\n'),
        }).catch(() => {});
      }

      LogService.success(
        `<@${winner.userId}> survit à l'avalanche (position **${winner.num}**, ${Object.keys(state.players ?? {}).length} joueurs) — +${AVALANCHE_REWARD.money} 💰 · +${AVALANCHE_REWARD.xp} XP · ${expeditions.summary}`,
        { feature: LOG_FEATURE, title: '🏆 Survivant' },
      ).catch(() => {});
    }

    if (thread?.isThread()) {
      await thread.setLocked(true).catch(() => {});
    }
    await GamesForumService.deleteAnnounce(client, state.announceMessageId);
    await AvalancheRepository.clearActive();
  }
}

import { ChannelType, TextChannel, VoiceChannel, VoiceState, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { getGuildId } from '../../../shared/guild';
import { LogService } from '../../../shared/logs/logs.service';
import { VoiceConfigRepository } from '../repositories/voice-config.repository';
import { VoiceSessionRepository } from '../repositories/voice-session.repository';
import { VOICE_XP_PER_MINUTE, VOICE_MONEY_PER_MINUTE, VOICE_MIN_ACTIVE_SECONDS, VOICE_MIN_COUNT_SECONDS } from '../constants/voice.constants';
import UserModel from '../../user/models/user.model';
import { LevelingService } from '../../leveling/services/leveling.service';
import type { PeakHuntersSessionResult } from '../../peak-hunters/services/peak-hunters.plugin';

// ─── Plugin contract ────────────────────────────────────────────────────────

export interface ActivePeriod {
  startedAt: number;
  endedAt: number;
}

export interface VoiceSession {
  userId: string;
  channelId: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  activeSeconds: number;
  activePeriods: ActivePeriod[];
}

export interface VoicePlugin {
  init?(): Promise<void>;
  onSessionStart?(userId: string, channelId: string, client: BotClient): void;
  onSessionEnd?(session: VoiceSession, client: BotClient): Promise<Record<string, unknown> | void>;
  onBeforeChannelCreate?(userId: string): {
    templateVars?: Record<string, string>;
    metadata?: Record<string, unknown>;
  };
  onChannelCreated?(
    channel: VoiceChannel,
    userId: string,
    metadata: Record<string, unknown>,
    client: BotClient,
  ): Promise<void>;
  onChannelDeleted?(channelId: string): void;
}

// ─── Internal session ───────────────────────────────────────────────────────

interface InternalSession {
  startedAt: number;
  channelId: string;
  channelName: string;
  activePeriods: ActivePeriod[];
  currentActiveStart: number | null;
  /** Cumul des secondes actives (utilisé après réhydratation quand activePeriods est vide) */
  totalActiveSeconds?: number;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class VoiceSessionService {
  private static plugins: VoicePlugin[] = [];
  private static sessions = new Map<string, InternalSession>();
  private static channelCreatedAt = new Map<string, number>();

  static registerPlugin(plugin: VoicePlugin): void {
    this.plugins.push(plugin);
    plugin.init?.().catch(err => console.error('[VoiceSessionService] Plugin init error:', err));
  }

  // ─── Voice state helpers ──────────────────────────────────────────────────

  static isTrackableChannel(state: VoiceState): boolean {
    if (!state.channelId) return false;
    const type = state.channel?.type;
    if (type === undefined || type === null) return true;
    return type === ChannelType.GuildVoice || type === ChannelType.GuildStageVoice;
  }

  private static isActiveState(state: VoiceState): boolean {
    return !state.selfMute && !state.selfDeaf && !state.serverMute && !state.serverDeaf && !state.suppress;
  }

  // ─── Session lifecycle ────────────────────────────────────────────────────

  private static async startSession(userId: string, channelId: string, channelName: string, active: boolean, client: BotClient): Promise<void> {
    const now = Date.now();
    const session: InternalSession = {
      startedAt: now,
      channelId,
      channelName,
      activePeriods: [],
      currentActiveStart: active ? now : null,
    };
    this.sessions.set(userId, session);

    await VoiceSessionRepository.upsert({
      userId,
      guildId: getGuildId(),
      channelId,
      channelName,
      startedAt: new Date(session.startedAt),
      totalActiveSeconds: 0,
      currentActiveStart: session.currentActiveStart ? new Date(session.currentActiveStart) : null,
    });
    console.log(`[VoiceSession] Session démarrée: user=${userId} channel=${channelId} active=${active}`);

    for (const plugin of this.plugins) {
      try { plugin.onSessionStart?.(userId, channelId, client); } catch {}
    }
  }

  private static endSession(userId: string): (VoiceSession & { channelName: string }) | null {
    const session = this.sessions.get(userId);
    if (!session) return null;

    this.sessions.delete(userId);
    const now = Date.now();

    if (session.currentActiveStart !== null) {
      session.activePeriods.push({ startedAt: session.currentActiveStart, endedAt: now });
      session.currentActiveStart = null;
    }

    const durationSeconds = Math.floor((now - session.startedAt) / 1000);
    const periodsSeconds = session.activePeriods.reduce(
      (acc, p) => acc + Math.floor((p.endedAt - p.startedAt) / 1000),
      0,
    );
    const currentPeriodSeconds = session.currentActiveStart !== null
      ? Math.floor((now - session.currentActiveStart) / 1000)
      : 0;
    const activeSeconds = (session.totalActiveSeconds ?? 0) + periodsSeconds + currentPeriodSeconds;

    VoiceSessionRepository.deleteByUserId(userId).catch(err =>
      console.error('[VoiceSession] Erreur suppression session DB:', err),
    );
    console.log(`[VoiceSession] Session terminée: user=${userId} durée=${durationSeconds}s actif=${activeSeconds}s`);

    return {
      userId,
      channelId: session.channelId,
      channelName: session.channelName,
      startedAt: session.startedAt,
      endedAt: now,
      durationSeconds,
      activeSeconds,
      activePeriods: session.activePeriods,
    };
  }

  private static async pauseSession(userId: string, session: InternalSession): Promise<void> {
    if (session.currentActiveStart === null) return;
    const now = Date.now();
    session.activePeriods.push({ startedAt: session.currentActiveStart, endedAt: now });
    session.currentActiveStart = null;

    const totalActiveSeconds = session.activePeriods.reduce(
      (acc, p) => acc + Math.floor((p.endedAt - p.startedAt) / 1000),
      0,
    );
    await VoiceSessionRepository.upsert({
      userId,
      guildId: getGuildId(),
      channelId: session.channelId,
      channelName: session.channelName,
      startedAt: new Date(session.startedAt),
      totalActiveSeconds,
      currentActiveStart: null,
    });
  }

  private static async resumeSession(userId: string, session: InternalSession): Promise<void> {
    if (session.currentActiveStart !== null) return;
    const now = Date.now();
    session.currentActiveStart = now;

    const totalActiveSeconds = session.activePeriods.reduce(
      (acc, p) => acc + Math.floor((p.endedAt - p.startedAt) / 1000),
      0,
    );
    await VoiceSessionRepository.upsert({
      userId,
      guildId: getGuildId(),
      channelId: session.channelId,
      channelName: session.channelName,
      startedAt: new Date(session.startedAt),
      totalActiveSeconds,
      currentActiveStart: new Date(now),
    });
  }

  // ─── Event handlers ───────────────────────────────────────────────────────

  static async handleJoin(client: BotClient, _oldState: VoiceState, newState: VoiceState): Promise<void> {
    if (newState.member?.user.bot || !newState.channelId) return;
    if (!this.isTrackableChannel(newState)) return;

    const userId = newState.member!.user.id;
    const active = this.isActiveState(newState);
    const channelName = newState.channel?.name ?? newState.channelId;

    await this.startSession(userId, newState.channelId, channelName, active, client);

    const vocConfig = await VoiceConfigRepository.get();
    const isJoinChannel = vocConfig?.joinChannels.some(c => c.id === newState.channelId);

    if (!isJoinChannel) {
      const username = newState.member?.user.username ?? userId;
      LogService.info(`<@${userId}> (**${username}**) a rejoint **${channelName}**`, {
        feature: 'voice',
        title: '🎙️ Session vocale démarrée',
      });
    }

    if (!vocConfig?.enabled) return;

    const joinChannel = vocConfig.joinChannels.find(c => c.id === newState.channelId);
    if (joinChannel) {
      await this.createUserChannel(client, newState, joinChannel, vocConfig.channelCount);
    }
  }

  static async handleLeave(client: BotClient, oldState: VoiceState, _newState: VoiceState): Promise<void> {
    if (oldState.member?.user.bot || !oldState.channelId) return;
    if (!this.isTrackableChannel(oldState)) return;

    const userId = oldState.member!.user.id;
    const channelId = oldState.channelId;

    const vocConfig = await VoiceConfigRepository.get();
    const isJoinChannel = vocConfig?.joinChannels.some(c => c.id === channelId);

    const session = this.endSession(userId);
    if (session) {
      if (!isJoinChannel) {
        const username = oldState.member?.user.username ?? userId;
        const duration = this.formatDuration(session.durationSeconds);
        const active = this.formatDuration(session.activeSeconds);
        LogService.info(`<@${userId}> (**${username}**) a quitté **${session.channelName}** — durée : ${duration} (actif : ${active})`, {
          feature: 'voice',
          title: '🔇 Session vocale terminée',
        });
      }

      const pluginResults: Record<string, unknown>[] = [];
      for (const plugin of this.plugins) {
        try {
          const result = await plugin.onSessionEnd?.(session, client);
          if (result) pluginResults.push(result);
        } catch (err) {
          console.error('[VoiceSession] Erreur plugin onSessionEnd:', err);
        }
      }

      await this.processSessionRewards(client, session, pluginResults, isJoinChannel);
    }

    if (!vocConfig?.enabled || !vocConfig.createdChannels.includes(channelId)) return;

    const channel = oldState.channel;
    if (channel && channel.members.size === 0) {
      try {
        await channel.delete();
        for (const plugin of this.plugins) {
          try { plugin.onChannelDeleted?.(channelId); } catch {}
        }
        const createdAt = this.channelCreatedAt.get(channelId);
        this.channelCreatedAt.delete(channelId);
        const tooShort = createdAt !== undefined && (Date.now() - createdAt) / 1000 < VOICE_MIN_COUNT_SECONDS;
        await VoiceConfigRepository.removeCreatedChannel(channelId, tooShort);
        console.log(`[VoiceSession] Canal supprimé: ${channel.name}`);
      } catch (err) {
        console.error('[VoiceSession] Erreur suppression canal:', err);
      }
    }
  }

  static async handleVoiceStateChange(oldState: VoiceState, newState: VoiceState): Promise<void> {
    if (newState.member?.user.bot) return;

    const userId = newState.id;
    const session = this.sessions.get(userId);
    if (!session) return;

    if (oldState.channelId !== newState.channelId && newState.channelId) {
      session.channelId = newState.channelId;
      session.channelName = newState.channel?.name ?? newState.channelId;
      await VoiceSessionRepository.upsert({
        userId,
        guildId: getGuildId(),
        channelId: session.channelId,
        channelName: session.channelName,
        startedAt: new Date(session.startedAt),
        totalActiveSeconds: session.activePeriods.reduce(
          (acc, p) => acc + Math.floor((p.endedAt - p.startedAt) / 1000),
          0,
        ),
        currentActiveStart: session.currentActiveStart ? new Date(session.currentActiveStart) : null,
      }).catch(() => {});
    }

    const wasActive = this.isActiveState(oldState);
    const isActive = this.isActiveState(newState);

    if (wasActive && !isActive) {
      await this.pauseSession(userId, session);
    } else if (!wasActive && isActive) {
      await this.resumeSession(userId, session);
    }
  }

  // ─── Rehydration ──────────────────────────────────────────────────────────

  static async rehydrate(client: BotClient): Promise<void> {
    const guild = client.guilds.cache.get(getGuildId());
    if (!guild) return;

    let count = 0;
    for (const [, state] of guild.voiceStates.cache) {
      if (!state.channelId || state.member?.user.bot) continue;
      if (!this.isTrackableChannel(state)) continue;

      const userId = state.id;
      const active = this.isActiveState(state);
      const channelName = state.channel?.name ?? state.channelId;

      const persisted = await VoiceSessionRepository.getByUserId(userId);
      const now = Date.now();
      const guildId = getGuildId();

      if (persisted) {
        const startedAt = persisted.startedAt.getTime();
        let totalActiveSeconds = persisted.totalActiveSeconds;
        if (persisted.currentActiveStart) {
          totalActiveSeconds += Math.floor((now - persisted.currentActiveStart.getTime()) / 1000);
        }
        const currentActiveStart = active ? now : null;
        const session: InternalSession = {
          startedAt,
          channelId: state.channelId,
          channelName,
          activePeriods: [],
          currentActiveStart,
          totalActiveSeconds,
        };
        this.sessions.set(userId, session);
        await VoiceSessionRepository.upsert({
          userId,
          guildId,
          channelId: state.channelId,
          channelName,
          startedAt: new Date(startedAt),
          totalActiveSeconds,
          currentActiveStart: currentActiveStart ? new Date(currentActiveStart) : null,
        });
        console.log(
          `[VoiceSession] Réhydratée: ${state.member?.user.tag || userId} ` +
          `channel=${channelName} active=${active} (timer préservé)`,
        );
      } else {
        await this.startSession(userId, state.channelId, channelName, active, client);
        console.log(
          `[VoiceSession] Réhydratée: ${state.member?.user.tag || userId} ` +
          `channel=${channelName} active=${active}`,
        );
      }
      count++;
    }

    if (count > 0) {
      console.log(`[VoiceSession] ${count} session(s) réhydratée(s)`);
    }
  }

  // ─── Session rewards & recap ──────────────────────────────────────────────

  private static async processSessionRewards(
    client: BotClient,
    session: VoiceSession & { channelName: string },
    pluginResults: Record<string, unknown>[],
    skipRecapEmbed: boolean = false,
  ): Promise<void> {
    const hasEnoughActive = session.activeSeconds >= VOICE_MIN_ACTIVE_SECONDS;
    const activeMinutes = Math.floor(session.activeSeconds / 60);
    const xpGained = hasEnoughActive ? activeMinutes * VOICE_XP_PER_MINUTE : 0;
    const moneyGained = hasEnoughActive ? activeMinutes * VOICE_MONEY_PER_MINUTE : 0;

    let leveledUp = false;
    let newLevel = 0;

    if (xpGained > 0 || moneyGained > 0) {
      try {
        const user = await UserModel.findOne({ discordId: session.userId });
        if (user) {
          const oldLevel = user.profil.lvl;
          user.profil.exp += xpGained;
          user.profil.money += moneyGained;

          while (user.profil.exp >= LevelingService.getXpToLevelUp(user.profil.lvl)) {
            user.profil.lvl++;
          }

          await user.save();
          leveledUp = user.profil.lvl > oldLevel;
          newLevel = user.profil.lvl;
        }
      } catch (err) {
        console.error('[VoiceSession] Erreur mise à jour récompenses:', err);
      }
    }

    const mountainResult = pluginResults.find(r => r.mountain)?.mountain as PeakHuntersSessionResult | undefined;

    if (!skipRecapEmbed) {
      await this.sendSessionRecap(client, session, {
        xpGained,
        moneyGained,
        leveledUp,
        newLevel,
        mountain: mountainResult,
      });
    }
  }

  private static async sendSessionRecap(
    client: BotClient,
    session: VoiceSession & { channelName: string },
    rewards: {
      xpGained: number;
      moneyGained: number;
      leveledUp: boolean;
      newLevel: number;
      mountain?: PeakHuntersSessionResult;
    },
  ): Promise<void> {
    const vocConfig = await VoiceConfigRepository.get();
    if (!vocConfig?.notificationChannelId) return;

    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    if (!guild) return;

    const channel = await guild.channels.fetch(vocConfig.notificationChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const member = await guild.members.fetch(session.userId).catch(() => null);
    const displayName = member?.displayName ?? member?.user.username ?? `<@${session.userId}>`;

    const startTimestamp = Math.floor(session.startedAt / 1000);
    const endTimestamp = Math.floor(session.endedAt / 1000);
    const duration = this.formatDuration(session.durationSeconds);
    const activeDuration = this.formatDuration(session.activeSeconds);

    const accentColor = rewards.mountain?.color ?? 0x5865f2;

    let rewardLines = `+**${rewards.xpGained}** XP ✨  ·  +**${rewards.moneyGained}** <:ridgecoin:1424543836029325492>`;
    if (rewards.leveledUp) rewardLines += `\n🎉 **Level up !** Niveau **${rewards.newLevel}**`;
    const vocTickets = rewards.mountain?.ticketsGained ?? 0;
    if (vocTickets > 0 && (rewards.mountain?.isNew || !rewards.mountain?.unlocked)) {
      rewardLines += `\n+**${vocTickets}** 🎟️ ticket${vocTickets > 1 ? 's' : ''} de pack`;
    }

    const container = new ContainerBuilder()
      .setAccentColor(accentColor)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 🔇 ${displayName} a quitté **${session.channelName}**`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⏰ <t:${startTimestamp}:t> → <t:${endTimestamp}:t>  ·  ⏱️ ${duration} (actif : ${activeDuration})`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(rewardLines),
      );

    if (rewards.mountain?.unlocked) {
      const m = rewards.mountain;
      const displayName = m.mountain.mountainLabel;

      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

      if (m.isNew) {
        let mountainText = [
          `### ${m.emoji} ${displayName}`,
          `${MountainService.getCountryDisplay(m.mountain)}  ·  📏 ${MountainService.getAltitude(m.mountain)}  ·  ${m.emoji} ${m.label}`,
          `✅ **Nouvelle montagne débloquée !**  ·  📊 \`${m.totalUnlocked}/${MountainService.count}\``,
        ].join('\n');

        container.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(mountainText))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(m.mountain.image)),
        );
      } else {
        let dupeText = [
          `### 🔁 ${displayName} — déjà possédée`,
          `${MountainService.getCountryDisplay(m.mountain)}  ·  📏 ${MountainService.getAltitude(m.mountain)}  ·  ${m.emoji} ${m.label}`,
          `+**${m.fragmentsGained}** fragment${(m.fragmentsGained ?? 0) > 1 ? 's' : ''} 🧩 (\`${m.totalFragments}/20\`)`,
        ].join('\n');
        if ((m.ticketsGained ?? 0) > 0) {
          dupeText += `\n+**${m.ticketsGained}** 🎟️ ticket${(m.ticketsGained ?? 0) > 1 ? 's' : ''}`;
        }

        container.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(dupeText))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(m.mountain.image)),
        );
      }
    }

    const hasRewards = rewards.xpGained > 0 || rewards.moneyGained > 0 || rewards.mountain != null;
    if (!hasRewards) return;

    try {
      await (channel as TextChannel).send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (err) {
      console.error('[VoiceSession] Erreur envoi recap:', err);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private static formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${hours}h` : `${hours}h${rest.toString().padStart(2, '0')}`;
  }

  private static async createUserChannel(
    client: BotClient,
    newState: VoiceState,
    joinChannel: { id: string; category: string; nameTemplate: string },
    channelCount: number,
  ): Promise<void> {
    const username = newState.member?.user.username ?? 'Utilisateur';
    const userId = newState.member!.user.id;

    const metadata: Record<string, unknown> = {};
    const extraVars: Record<string, string> = {};

    for (const plugin of this.plugins) {
      try {
        const result = plugin.onBeforeChannelCreate?.(userId);
        if (result) {
          Object.assign(extraVars, result.templateVars ?? {});
          Object.assign(metadata, result.metadata ?? {});
        }
      } catch {}
    }

    let channelName = (joinChannel.nameTemplate ?? '{mountain} #{count}')
      .replace('{username}', username)
      .replace('{user}', username)
      .replace('{count}', (channelCount + 1).toString())
      .replace('{total}', (channelCount + 1).toString());

    for (const [key, value] of Object.entries(extraVars)) {
      channelName = channelName.replace(`{${key}}`, value);
    }

    try {
      const newChannel = await newState.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: joinChannel.category,
      });

      if (newState.member?.voice.channel) {
        await newState.member.voice.setChannel(newChannel).catch(err => {
          console.error('[VoiceSession] Erreur déplacement utilisateur:', err);
        });
      }

      await VoiceConfigRepository.addCreatedChannel(newChannel.id);
      this.channelCreatedAt.set(newChannel.id, Date.now());

      for (const plugin of this.plugins) {
        try {
          await plugin.onChannelCreated?.(newChannel, userId, metadata, client);
        } catch (err) {
          console.error('[VoiceSession] Erreur plugin onChannelCreated:', err);
        }
      }

      console.log(`[VoiceSession] Canal créé: ${newChannel.name} pour ${username}`);
    } catch (err) {
      console.error('[VoiceSession] Erreur création canal:', err);
    }
  }
}

// Avoid circular import — resolved at runtime
import { MountainService } from '../../peak-hunters/services/mountain.service';

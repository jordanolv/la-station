import { ChannelType, EmbedBuilder, TextChannel, VoiceChannel, VoiceState } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { getGuildId } from '../../../shared/guild';
import { LogService } from '../../../shared/logs/logs.service';
import { VoiceConfigRepository } from '../repositories/voice-config.repository';
import { VOICE_XP_PER_MINUTE, VOICE_MONEY_PER_MINUTE, VOICE_MIN_ACTIVE_SECONDS } from '../constants/voice.constants';
import UserModel from '../../user/models/user.model';
import { LevelingService } from '../../leveling/services/leveling.service';
import type { MountainSessionResult } from '../../mountain/services/mountain.plugin';

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
}

// ─── Service ────────────────────────────────────────────────────────────────

export class VoiceSessionService {
  private static plugins: VoicePlugin[] = [];
  private static sessions = new Map<string, InternalSession>();

  static registerPlugin(plugin: VoicePlugin): void {
    this.plugins.push(plugin);
  }

  // ─── Voice state helpers ──────────────────────────────────────────────────

  static isTrackableChannel(state: VoiceState): boolean {
    if (!state.channelId) return false;
    const type = state.channel?.type;
    if (type === undefined || type === null) return true;
    return type === ChannelType.GuildVoice || type === ChannelType.GuildStageVoice;
  }

  private static isActiveState(state: VoiceState): boolean {
    return !state.selfMute && !state.selfDeaf && !state.serverMute && !state.serverDeaf;
  }

  // ─── Session lifecycle ────────────────────────────────────────────────────

  private static startSession(userId: string, channelId: string, channelName: string, active: boolean, client: BotClient): void {
    const now = Date.now();
    const session: InternalSession = {
      startedAt: now,
      channelId,
      channelName,
      activePeriods: [],
      currentActiveStart: active ? now : null,
    };
    this.sessions.set(userId, session);
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
    const activeSeconds = session.activePeriods.reduce(
      (acc, p) => acc + Math.floor((p.endedAt - p.startedAt) / 1000),
      0,
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

  private static pauseSession(session: InternalSession): void {
    if (session.currentActiveStart === null) return;
    session.activePeriods.push({ startedAt: session.currentActiveStart, endedAt: Date.now() });
    session.currentActiveStart = null;
  }

  private static resumeSession(session: InternalSession): void {
    if (session.currentActiveStart !== null) return;
    session.currentActiveStart = Date.now();
  }

  // ─── Event handlers ───────────────────────────────────────────────────────

  static async handleJoin(client: BotClient, _oldState: VoiceState, newState: VoiceState): Promise<void> {
    if (newState.member?.user.bot || !newState.channelId) return;
    if (!this.isTrackableChannel(newState)) return;

    const userId = newState.member!.user.id;
    const active = this.isActiveState(newState);
    const channelName = newState.channel?.name ?? newState.channelId;

    this.startSession(userId, newState.channelId, channelName, active, client);

    const vocConfig = await VoiceConfigRepository.get();
    const isJoinChannel = vocConfig?.joinChannels.some(c => c.id === newState.channelId);

    if (!isJoinChannel) {
      const username = newState.member?.user.username ?? userId;
      LogService.info(client, `<@${userId}> (**${username}**) a rejoint **${channelName}**`, {
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
        LogService.info(client, `<@${userId}> (**${username}**) a quitté **${session.channelName}** — durée : ${duration} (actif : ${active})`, {
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
        await VoiceConfigRepository.removeCreatedChannel(channelId);
        console.log(`[VoiceSession] Canal supprimé: ${channel.name}`);
      } catch (err) {
        console.error('[VoiceSession] Erreur suppression canal:', err);
      }
    }
  }

  static handleVoiceStateChange(oldState: VoiceState, newState: VoiceState): void {
    if (newState.member?.user.bot) return;

    const userId = newState.id;
    const session = this.sessions.get(userId);
    if (!session) return;

    if (oldState.channelId !== newState.channelId && newState.channelId) {
      session.channelId = newState.channelId;
      session.channelName = newState.channel?.name ?? newState.channelId;
    }

    const wasActive = this.isActiveState(oldState);
    const isActive = this.isActiveState(newState);

    if (wasActive && !isActive) {
      this.pauseSession(session);
    } else if (!wasActive && isActive) {
      this.resumeSession(session);
    }
  }

  // ─── Rehydration ──────────────────────────────────────────────────────────

  static rehydrate(client: BotClient): void {
    const guild = client.guilds.cache.get(getGuildId());
    if (!guild) return;

    let count = 0;
    guild.voiceStates.cache.forEach(state => {
      if (!state.channelId || state.member?.user.bot) return;
      if (!this.isTrackableChannel(state)) return;

      const active = this.isActiveState(state);
      const channelName = state.channel?.name ?? state.channelId;
      this.startSession(state.id, state.channelId, channelName, active, client);
      count++;

      console.log(
        `[VoiceSession] Réhydratée: ${state.member?.user.tag || state.id} ` +
        `channel=${channelName} active=${active}`,
      );
    });

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

    const mountainResult = pluginResults.find(r => r.mountain)?.mountain as MountainSessionResult | undefined;

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
      mountain?: MountainSessionResult;
    },
  ): Promise<void> {
    const vocConfig = await VoiceConfigRepository.get();
    if (!vocConfig?.notificationChannelId) return;

    const guild = await client.guilds.fetch(getGuildId()).catch(() => null);
    if (!guild) return;

    const channel = await guild.channels.fetch(vocConfig.notificationChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const startTimestamp = Math.floor(session.startedAt / 1000);
    const endTimestamp = Math.floor(session.endedAt / 1000);
    const duration = this.formatDuration(session.durationSeconds);
    const activeDuration = this.formatDuration(session.activeSeconds);

    const embed = new EmbedBuilder()
      .setColor(rewards.mountain?.color ?? 0x5865f2)
      .setTitle('🔇 Session vocale terminée')
      .setDescription(`<@${session.userId}> a quitté **${session.channelName}**`)
      .addFields(
        { name: '⏰ Arrivée', value: `<t:${startTimestamp}:t>`, inline: true },
        { name: '⏰ Départ', value: `<t:${endTimestamp}:t>`, inline: true },
        { name: '⏱️ Durée', value: `${duration} (actif : ${activeDuration})`, inline: true },
      )
      .setTimestamp();

    let rewardLines = `+**${rewards.xpGained}** XP ✨\n+**${rewards.moneyGained}** <:ridgecoin:1424543836029325492>`;
    if (rewards.leveledUp) {
      rewardLines += `\n🎉 **Level up !** Niveau **${rewards.newLevel}**`;
    }
    const vocTickets = rewards.mountain?.ticketsGained ?? 0;
    if (vocTickets > 0 && (rewards.mountain?.isNew || !rewards.mountain?.unlocked)) {
      rewardLines += `\n+**${vocTickets}** 🎟️ ticket${vocTickets > 1 ? 's' : ''} de pack`;
    }
    embed.addFields({ name: '📊 Récompenses', value: rewardLines, inline: false });

    if (rewards.mountain && rewards.mountain.unlocked) {
      const m = rewards.mountain;
      if (m.isNew) {
        embed.addFields(
          { name: '🏔️ Montagne débloquée !', value: `**${m.mountain.name}** (${m.mountain.altitude})`, inline: true },
          { name: '✨ Rareté', value: `${m.emoji} ${m.label}`, inline: true },
          { name: '📊 Collection', value: `${m.totalUnlocked}/${MountainService.count}`, inline: true },
        );
        embed.setImage(m.mountain.image);
      } else {
        let dupeDesc = `**${m.mountain.name}** — déjà possédée\n+**${m.fragmentsGained}** fragment${(m.fragmentsGained ?? 0) > 1 ? 's' : ''} 🧩 (\`${m.totalFragments}/20\`)`;
        if ((m.ticketsGained ?? 0) > 0) {
          dupeDesc += `\n+**${m.ticketsGained}** 🎟️ ticket${(m.ticketsGained ?? 0) > 1 ? 's' : ''}`;
        }
        embed.addFields({ name: '🔁 Montagne en double', value: dupeDesc, inline: false });
        embed.setThumbnail(m.mountain.image);
      }
    }

    try {
      await (channel as TextChannel).send({ embeds: [embed] });
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
import { MountainService } from '../../mountain/services/mountain.service';

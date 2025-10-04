import { ChannelType, VoiceState } from 'discord.js';
import { LogService } from '../../../shared/logs/logs.service';
import { BotClient } from '../../../bot/client';
import { UserRepository } from '../../user/services/user.repository';
import { IGuildUser } from '../../user/models/guild-user.model';

export type VoiceHistorySegment = {
  date: Date;
  seconds: number;
};

export type VoiceHistoryMergeMode = 'append' | 'replace';

type VoiceSessionState = {
  connectedAt: number;
  firstActiveAt?: number;
  joinTime?: number;
  accumulatedSeconds: number;
  segments: VoiceHistorySegment[];
  channelId?: string | null;
};

// Stockage temporaire des états vocaux (clé = userId-guildId)
const voiceStates: Map<string, VoiceSessionState> = new Map();

export class StatsService {
  private static userRepo = new UserRepository();

  private static getVoiceSessionKey(userId: string, guildId: string): string {
    return `${userId}-${guildId}`;
  }

  static isVoiceStateTrackable(state: VoiceState): boolean {
    if (!state.channelId) return false;
    const channelType = state.channel?.type;

    if (channelType === undefined || channelType === null) {
      // Si nous ne connaissons pas le type (partiel), on considère la session comme potentiellement suivie
      return true;
    }

    return this.isTrackableVoiceChannel(channelType);
  }

  private static canEarnVoiceXp(state: VoiceState): boolean {
    if (!state.channelId) return false;

    const channelType = state.channel?.type;
    if (channelType && !this.isTrackableVoiceChannel(channelType)) return false;

    return !state.selfMute && !state.selfDeaf && !state.serverMute && !state.serverDeaf;
  }

  private static resumeVoiceSession(session: VoiceSessionState, resumedAt: number): void {
    if (session.joinTime) return;
    session.joinTime = resumedAt;
    if (!session.firstActiveAt) {
      session.firstActiveAt = resumedAt;
    }
  }

  private static pauseVoiceSession(session: VoiceSessionState, pausedAt: number): void {
    if (!session.joinTime) return;
    this.addActiveDuration(session, session.joinTime, pausedAt);
    session.joinTime = undefined;
  }

  private static addActiveDuration(session: VoiceSessionState, startMs: number, endMs: number): void {
    if (endMs <= startMs) {
      return;
    }

    const expectedSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));
    if (expectedSeconds <= 0) {
      return;
    }

    const segments = this.splitSessionIntoDailySegments(
      new Date(startMs),
      new Date(endMs),
      expectedSeconds
    );

    if (!segments.length) {
      return;
    }

    this.mergeSegments(session, segments);

    const addedSeconds = segments.reduce((acc, segment) => acc + segment.seconds, 0);
    session.accumulatedSeconds += addedSeconds;
  }

  private static mergeSegments(session: VoiceSessionState, segments: VoiceHistorySegment[]): void {
    segments.forEach(segment => {
      const existing = session.segments.find(entry => this.isSameDay(entry.date, segment.date));

      if (existing) {
        existing.seconds += segment.seconds;
      } else {
        session.segments.push({
          date: new Date(segment.date),
          seconds: segment.seconds
        });
      }
    });
  }

  /**
   * Enregistre le début d'une session vocale pour un utilisateur
   */
  static startVoiceSession(
    userId: string,
    guildId: string,
    joinTime: number = Date.now(),
    channelId?: string | null,
    isActive: boolean = false
  ): void {
    const userKey = this.getVoiceSessionKey(userId, guildId);
    const session: VoiceSessionState = {
      connectedAt: joinTime,
      channelId,
      accumulatedSeconds: 0,
      segments: []
    };

    if (isActive) {
      session.joinTime = joinTime;
      session.firstActiveAt = joinTime;
    }

    voiceStates.set(userKey, session);
  }

  /**
   * Termine une session vocale et met à jour les statistiques
   */
  static async endVoiceSession(client: BotClient, userId: string, guildId: string, username: string): Promise<void> {
    const userKey = this.getVoiceSessionKey(userId, guildId);
    const userState = voiceStates.get(userKey);

    if (!userState) {
      return;
    }

    const now = Date.now();
    this.pauseVoiceSession(userState, now);
    voiceStates.delete(userKey);

    const totalSeconds = userState.accumulatedSeconds;

    if (totalSeconds <= 0) {
      return;
    }

    userState.segments.sort((a, b) => a.date.getTime() - b.date.getTime());
    const segments = userState.segments.map(segment => ({
      date: new Date(segment.date),
      seconds: segment.seconds
    }));

    const channelInfo = userState.channelId ? `channel ${userState.channelId}` : 'channel inconnu';
    const sessionStartMs = userState.firstActiveAt ?? userState.connectedAt;
    const sessionStartText = new Date(sessionStartMs).toLocaleString('fr-FR');
    const sessionEndText = new Date(now).toLocaleString('fr-FR');

    try {
      await this.updateVoiceStats({
        userId,
        guildId,
        username,
        totalSeconds,
        segments
      });
      
      // Ajout du log de session vocale
      await LogService.info(
        client,
        guildId,
        `${username} a passé ${this.formatVoiceTime(totalSeconds)} en vocal`,
        { feature: 'stats', title: 'Session vocale terminée' }
      );

      // Session terminée - log supprimé pour éviter le spam
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statistiques vocales:', error);
      await LogService.error(
        client,
        guildId,
        `Erreur lors de l'enregistrement de la session vocale pour ${username}: ${error}`,
        { feature: 'stats', title: 'Erreur de statistiques' }
      );
    }
  }

  /**
   * Met à jour les statistiques vocales d'un utilisateur
   */
  static async updateVoiceStats(params: {
    userId: string;
    guildId: string;
    username: string;
    totalSeconds: number;
    segments: VoiceHistorySegment[];
  }): Promise<void> {
    const { userId, guildId, username, totalSeconds, segments } = params;

    if (!segments.length || totalSeconds <= 0) {
      return;
    }

    try {
      const guildUser = await this.userRepo.findGuildUserById(userId, guildId);
      
      if (guildUser) {
        const addedSeconds = this.applyVoiceSegmentsToGuildUser(guildUser, segments);
        guildUser.infos.updatedAt = new Date();
        guildUser.stats.voiceTime += addedSeconds;
        await guildUser.save();
      } else {
        // Créer un nouvel utilisateur s'il n'existe pas
        const newUser = await this.userRepo.createGuildUser({
          discordId: userId,
          name: username || 'Unknown User',
          guildId: guildId
        });
        
        const addedSeconds = this.applyVoiceSegmentsToGuildUser(newUser, segments, 'replace');
        newUser.stats.voiceTime = addedSeconds;
        newUser.infos.updatedAt = new Date();
        await newUser.save();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statistiques utilisateur:', error);
      throw error;
    }
  }

  /**
   * Incrémente le compteur de messages pour un utilisateur
   */
  static async incrementMessageCount(client: BotClient, userId: string, guildId: string, username: string): Promise<void> {
    try {
      const guildUser = await this.userRepo.findGuildUserById(userId, guildId);
      
      if (guildUser) {
        await this.userRepo.updateGuildUser(userId, guildId, {
          stats: { totalMsg: guildUser.stats.totalMsg + 1 }
        });
        
        // Log du message uniquement tous les 100 messages pour éviter de surcharger les logs
        if ((guildUser.stats.totalMsg + 1) % 100 === 0) {
          await LogService.info(
            client,
            guildId,
            `${username} a atteint ${guildUser.stats.totalMsg + 1} messages`,
            { feature: 'stats', title: 'Statistiques de messages' }
          );
        }
      } else {
        // Créer un nouvel utilisateur s'il n'existe pas
        const newUser = await this.userRepo.createGuildUser({
          discordId: userId,
          name: username || 'Unknown User',
          guildId: guildId
        });
        
        // Puis incrémenter le compteur de messages
        newUser.stats.totalMsg = 1;
        await newUser.save();
      }
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation du compteur de messages:', error);
      await LogService.error(
        client,
        guildId,
        `Erreur lors de l'incrémentation du compteur de messages pour ${username}: ${error}`,
        { feature: 'stats', title: 'Erreur de statistiques' }
      );
      throw error;
    }
  }

  /**
   * Gère l'événement quand un utilisateur rejoint un canal vocal
   */
  static handleUserJoinVoice(oldState: VoiceState, newState: VoiceState): void {
    const userId = newState.id;
    const guildId = newState.guild.id;
    const joinedAt = Date.now();

    if (!newState.channelId) return;
    const channelType = newState.channel?.type;
    if (channelType && !this.isTrackableVoiceChannel(channelType)) return;

    const canEarn = this.canEarnVoiceXp(newState);
    this.startVoiceSession(userId, guildId, joinedAt, newState.channelId, canEarn);

    const username = newState.member?.user.tag || newState.member?.user.username || userId;
    const channelName = newState.channel?.name || newState.channelId;
    const statusText = canEarn ? 'session active' : 'session en pause (mute/deaf)';
    console.log(
      `[STATS][VOICE] Session démarrée pour ${username} (${userId}) ` +
      `dans ${guildId} - salon ${channelName}. Début: ${new Date(joinedAt).toLocaleString('fr-FR')} (${statusText})`
    );
  }

  /**
   * Gère un changement d'état vocal (mute/deaf/move) sans join/leave
   */
  static handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void {
    const userId = newState.id;
    const guildId = newState.guild.id;
    const userKey = this.getVoiceSessionKey(userId, guildId);
    const session = voiceStates.get(userKey);

    if (!session) {
      return;
    }

    const hasMoved = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;
    if (hasMoved) {
      session.channelId = newState.channelId;
    }

    const oldEligible = this.canEarnVoiceXp(oldState);
    const newEligible = this.canEarnVoiceXp(newState);

    if (oldEligible === newEligible) {
      return;
    }

    const now = Date.now();
    const username = newState.member?.user.tag || newState.member?.user.username || userId;
    const channelName = newState.channel?.name || oldState.channel?.name || session.channelId || 'unknown';

    if (newEligible) {
      this.resumeVoiceSession(session, now);
    } else {
      this.pauseVoiceSession(session, now);
    }
  }

  /**
   * Gère l'événement quand un utilisateur quitte un canal vocal
   */
  static async handleUserLeaveVoice(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    const userId = oldState.id;
    const guildId = oldState.guild.id;
    const username = oldState.member?.user.username || 'Unknown User';

    if (!oldState.channelId) return;
    const channelType = oldState.channel?.type;
    if (channelType && !this.isTrackableVoiceChannel(channelType)) return;

    await this.endVoiceSession(client, userId, guildId, username);
  }
  
  /**
   * Formate le temps vocal en heures, minutes et secondes
   */
  private static formatVoiceTime(seconds: number): string {
    if (seconds < 60) return `${seconds} secondes`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} heure${hours > 1 ? 's' : ''} et ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
    }
  }

  /**
   * Réhydrate les sessions vocales actives (utilisé au démarrage du bot)
   */
  static rehydrateActiveSessions(client: BotClient): void {
    let restoredCount = 0;
    client.guilds.cache.forEach(guild => {
      guild.voiceStates.cache.forEach(state => {
        if (!state.channelId) return;
        if (state.member?.user.bot) return;

        const channelType = state.channel?.type;
        if (channelType && !this.isTrackableVoiceChannel(channelType)) return;

        const joinedAt = Date.now();
        const canEarn = this.canEarnVoiceXp(state);
        this.startVoiceSession(state.id, guild.id, joinedAt, state.channelId, canEarn);
        restoredCount += 1;
        console.log(
          `[STATS][VOICE] Session réhydratée pour ${state.member?.user.tag || state.id} (${state.id}) ` +
          `dans ${guild.id} - salon ${state.channel?.name || state.channelId}. ` +
          `${canEarn ? 'Session active.' : 'En attente (mute/deaf).'}`
        );
      });
    });

    if (restoredCount > 0) {
      const chalk = require('chalk');
      console.log(chalk.cyan('🎙️  [VOICE]') + chalk.gray(` ${restoredCount} session(s) réhydratée(s)`));
    }
  }

  /**
   * Normalise une date au début de journée
   */
  private static normalizeDate(date: Date): Date {
    const local = new Date(date);
    return new Date(Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate()
    ));
  }

  private static isSameDay(dateA: Date, dateB: Date): boolean {
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    );
  }

  private static isTrackableVoiceChannel(type: ChannelType): boolean {
    return type === ChannelType.GuildVoice || type === ChannelType.GuildStageVoice;
  }

  private static splitSessionIntoDailySegments(start: Date, end: Date, expectedTotalSeconds: number): VoiceHistorySegment[] {
    const segments: VoiceHistorySegment[] = [];

    let cursor = new Date(start);
    while (cursor < end) {
      const dayStart = this.normalizeDate(cursor);
      const nextDayStart = new Date(dayStart);
      nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

      const segmentEnd = new Date(Math.min(nextDayStart.getTime(), end.getTime()));
      const diffSeconds = Math.floor((segmentEnd.getTime() - cursor.getTime()) / 1000);

      if (diffSeconds > 0) {
        segments.push({ date: dayStart, seconds: diffSeconds });
      }

      cursor = segmentEnd;
    }

    const accumulated = segments.reduce((acc, seg) => acc + seg.seconds, 0);
    const delta = expectedTotalSeconds - accumulated;
    if (delta > 0 && segments.length > 0) {
      segments[segments.length - 1].seconds += delta;
    }

    return segments;
  }

  /**
   * Fusionne des segments vocaux dans les stats d'un utilisateur
   */
  static applyVoiceSegmentsToGuildUser(
    guildUser: IGuildUser,
    segments: VoiceHistorySegment[],
    mode: VoiceHistoryMergeMode = 'append'
  ): number {
    const sanitizedSegments = segments
      .map(segment => ({
        date: this.normalizeDate(segment.date),
        seconds: Math.max(0, Math.floor(segment.seconds))
      }))
      .filter(segment => segment.seconds > 0);

    if (!sanitizedSegments.length) {
      return 0;
    }

    if (mode === 'replace') {
      guildUser.stats.voiceHistory = [];
      guildUser.stats.voiceTime = 0;
    }

    let addedSeconds = 0;

    sanitizedSegments.forEach(segment => {
      const existingEntry = guildUser.stats.voiceHistory.find(entry => this.isSameDay(entry.date, segment.date));

      if (existingEntry) {
        existingEntry.time += segment.seconds;
      } else {
        guildUser.stats.voiceHistory.push({
          date: new Date(segment.date),
          time: segment.seconds
        } as any);
      }

      addedSeconds += segment.seconds;
    });

    guildUser.stats.voiceHistory.sort((a, b) => a.date.getTime() - b.date.getTime());
    if (guildUser.stats.voiceHistory.length > 100) {
      guildUser.stats.voiceHistory = guildUser.stats.voiceHistory.slice(-100);
    }

    guildUser.infos.updatedAt = new Date();

    return addedSeconds;
  }
}

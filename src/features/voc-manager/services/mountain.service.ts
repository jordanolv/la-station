import { EmbedBuilder } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { BotClient } from '../../../bot/client';
import { MOUNTAIN_REQUIRED_SECONDS } from '../constants/vocManager.constants';
import { UserMountainsRepository } from '../repositories/userMountains.repository';
import { VocManagerRepository } from '../repositories/vocManager.repository';

export interface MountainInfo {
  id: string;
  name: string;
  description: string;
  altitude: string;
  image: string;
  wiki: string;
}

interface UserSession {
  mountainId: string;
  joinedAt: number;
}

export class MountainService {
  private static mountains: MountainInfo[] = [];
  // Map<userId_channelId, session>
  private static sessions = new Map<string, UserSession>();
  // Map<channelId, mountainId>
  private static channelMountains = new Map<string, string>();

  static {
    MountainService.loadMountains();
  }

  // ─── Mountains data ────────────────────────────────────────────────────────

  static loadMountains(): void {
    try {
      const filePath = path.join(__dirname, '../data/mountains.json');
      this.mountains = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`[MountainService] ${this.mountains.length} montagnes chargées`);
    } catch (err) {
      console.error('[MountainService] Erreur chargement mountains.json:', err);
      this.mountains = [];
    }
  }

  static getAll(): MountainInfo[] {
    return [...this.mountains];
  }

  static getById(id: string): MountainInfo | undefined {
    return this.mountains.find(m => m.id === id);
  }

  static getRandom(): MountainInfo | null {
    if (this.mountains.length === 0) return null;
    return this.mountains[Math.floor(Math.random() * this.mountains.length)];
  }

  // ─── Channel ↔ Mountain association ───────────────────────────────────────

  static associateChannel(channelId: string, mountainId: string): void {
    this.channelMountains.set(channelId, mountainId);
  }

  static getChannelMountain(channelId: string): string | undefined {
    return this.channelMountains.get(channelId);
  }

  static dissociateChannel(channelId: string): void {
    this.channelMountains.delete(channelId);
  }

  // ─── User sessions ─────────────────────────────────────────────────────────

  static startSession(userId: string, channelId: string, mountainId: string): void {
    this.sessions.set(`${userId}_${channelId}`, { mountainId, joinedAt: Date.now() });
    console.log(`[MountainService] Session démarrée: user=${userId} channel=${channelId} mountain=${mountainId}`);
  }

  static endSession(userId: string, channelId: string): { mountainId: string; durationSeconds: number } | null {
    const key = `${userId}_${channelId}`;
    const session = this.sessions.get(key);
    if (!session) return null;

    this.sessions.delete(key);
    const durationSeconds = Math.floor((Date.now() - session.joinedAt) / 1000);
    console.log(`[MountainService] Session terminée: user=${userId} durée=${durationSeconds}s`);
    return { mountainId: session.mountainId, durationSeconds };
  }

  // ─── Unlock logic ──────────────────────────────────────────────────────────

  static async checkAndUnlock(client: BotClient, userId: string, channelId: string, guildId: string): Promise<void> {
    const session = this.endSession(userId, channelId);
    if (!session) return;

    if (session.durationSeconds < MOUNTAIN_REQUIRED_SECONDS) {
      console.log(`[MountainService] user=${userId} ${session.durationSeconds}s < ${MOUNTAIN_REQUIRED_SECONDS}s requis`);
      return;
    }

    await this.unlock(client, userId, session.mountainId, guildId);
  }

  private static async unlock(client: BotClient, userId: string, mountainId: string, guildId: string): Promise<void> {
    try {
      const result = await UserMountainsRepository.unlock(userId, mountainId);
      if (!result) {
        console.log(`[MountainService] ${mountainId} déjà débloqué pour ${userId}`);
        return;
      }

      const mountain = this.getById(mountainId);
      if (!mountain) return;

      console.log(`[MountainService] ${mountainId} débloqué pour ${userId} (${result.totalUnlocked}/${this.mountains.length})`);
      await this.sendUnlockNotification(client, userId, mountain, result.totalUnlocked, guildId);
    } catch (err) {
      console.error('[MountainService] Erreur déblocage:', err);
    }
  }

  private static async sendUnlockNotification(
    client: BotClient,
    userId: string,
    mountain: MountainInfo,
    totalUnlocked: number,
    guildId: string
  ): Promise<void> {
    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const vocManager = await VocManagerRepository.get(guildId);
      if (!vocManager?.notificationChannelId) return;

      const channel = await guild.channels.fetch(vocManager.notificationChannelId).catch(() => null);
      if (!channel?.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏔️ Nouvelle montagne débloquée !')
        .setDescription(`<@${userId}> a débloqué **${mountain.name}** !`)
        .addFields(
          { name: '📏 Altitude', value: mountain.altitude, inline: true },
          { name: '📊 Progression', value: `${totalUnlocked}/${this.mountains.length} montagnes`, inline: true }
        )
        .setThumbnail(mountain.image)
        .setFooter({ text: 'Continuez à explorer pour débloquer toutes les montagnes !' })
        .setTimestamp();

      await (channel as import('discord.js').TextChannel).send({ embeds: [embed] }).catch(err => {
        console.error('[MountainService] Erreur envoi notification:', err);
      });
    } catch (err) {
      console.error('[MountainService] Erreur notification:', err);
    }
  }
}

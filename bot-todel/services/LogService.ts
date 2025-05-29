import { TextChannel, Guild } from 'discord.js';
import { GuildService } from '../../database/services/GuildService';
import { BotClient } from '../BotClient';
import { EmbedUtils } from '../../src/bot/utils/EmbedUtils';

export type LogType = 'info' | 'warning' | 'error' | 'success' | 'debug';
export type LogFeature = 'birthday' | 'welcome' | 'moderation' | 'games' | 'system' | string;

interface LogOptions {
  feature?: LogFeature;
  title?: string;
  timestamp?: boolean;
  footer?: string;
  file?: string;
  line?: number;
}

export class LogService {
  private static readonly TITLES: Record<LogType, string> = {
    info: 'Information',
    warning: 'Avertissement',
    error: 'Erreur',
    success: 'Succès',
    debug: 'Debug'
  };

  private static readonly COLORS: Record<LogType, number> = {
    info: EmbedUtils.Colors.INFO,
    warning: EmbedUtils.Colors.WARNING,
    error: EmbedUtils.Colors.ERROR,
    success: EmbedUtils.Colors.SUCCESS,
    debug: EmbedUtils.Colors.DEBUG
  };

  /**
   * Envoie un log dans le canal de logs de la guilde
   */
  static async sendLog(
    guildId: string,
    content: string,
    type: LogType = 'info',
    options: LogOptions = {}
  ): Promise<void> {
    try {
      const { feature, title, timestamp = true, footer, file, line } = options;

      // Vérification rapide des logs activés
      const guildData = await GuildService.getGuildById(guildId);

      if (!this.isLoggingEnabled(guildData)) {
        return;
      }

      // Récupération du canal de logs
      const logChannel = await this.getLogChannel(guildId, guildData.features.logs.channel);
      
      if (!logChannel) return;

      const embed = EmbedUtils.createLogEmbed(type, content, {
        feature,
        file,
        line,
        timestamp,
        footer: footer || title
      });

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`[LogService] Error sending log:`, error);
    }
  }

  /**
   * Méthodes utilitaires pour les types de logs courants
   */
  static async info(guildId: string, content: string, options?: LogOptions): Promise<void> {
    await this.sendLog(guildId, content, 'info', options);
  }

  static async warning(guildId: string, content: string, options?: LogOptions): Promise<void> {
    await this.sendLog(guildId, content, 'warning', options);
  }

  static async error(guildId: string, content: string, options?: LogOptions): Promise<void> {
    await this.sendLog(guildId, content, 'error', options);
  }

  static async success(guildId: string, content: string, options?: LogOptions): Promise<void> {
    await this.sendLog(guildId, content, 'success', options);
  }

  static async debug(guildId: string, content: string, options?: LogOptions): Promise<void> {
    await this.sendLog(guildId, content, 'debug', options);
  }

  /**
   * Méthodes privées utilitaires
   */
  private static isLoggingEnabled(guildData: any): boolean {
    return guildData?.features?.logs?.enabled && guildData?.features?.logs?.channel;
  }

  private static async getLogChannel(guildId: string, channelId: string): Promise<TextChannel | null> {
    const guild = BotClient.getInstance().guilds.cache.get(guildId);
    if (!guild) return null;

    const channel = guild.channels.cache.get(channelId) as TextChannel;
    return channel || null;
  }
} 
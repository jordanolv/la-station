import { TextChannel } from 'discord.js';
import { BotClient } from '../../bot/client';
import { EmbedUtils } from '../../bot/utils/EmbedUtils';
import LogsModel, { ILogs } from './logs.model';

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
   * Récupère les paramètres de logs pour une guilde
   */
  static async getLog(guildId: string): Promise<ILogs | null> {
    return LogsModel.findOne({ guildId });
  }

  /**
   * Crée une configuration de logs pour une guilde
   */
  static async createLog(guildId: string, enabled: boolean = false, channel: string = ''): Promise<ILogs> {
    return LogsModel.create({
      guildId,
      enabled,
      channel
    });
  }

  /**
   * Récupère ou crée une configuration de logs pour une guilde
   */
  static async getOrCreateLog(guildId: string, enabled: boolean = false, channel: string = ''): Promise<ILogs> {
    const log = await this.getLog(guildId);
    if (log) {
      return log;
    }
    
    return this.createLog(guildId, enabled, channel);
  }

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
      const logData = await this.getLog(guildId);

      if (!this.isLoggingEnabled(logData)) {
        return;
      }

      // Récupération du canal de logs
      const logChannel = await this.getLogChannel(guildId, logData?.channel || '');
      
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
  private static isLoggingEnabled(logData: ILogs | null): boolean {
    return logData?.enabled && !!logData?.channel;
  }

  private static async getLogChannel(guildId: string, channelId: string): Promise<TextChannel | null> {
    const guild = BotClient.getInstance().guilds.cache.get(guildId);
    if (!guild) return null;

    const channel = guild.channels.cache.get(channelId) as TextChannel;
    return channel || null;
  }
} 
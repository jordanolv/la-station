import { EmbedBuilder, TextChannel, Client } from 'discord.js';
import { LogLevel, COLORS } from './constants';
import { ILogs } from './logs/logs.model';
import LogsModel from './logs/logs.model';

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
  private static client: Client | null = null;
  private static initialized = false;

  /**
   * Initialise le service de logs avec le client Discord
   */
  static initialize(client: Client) {
    this.client = client;
    this.initialized = true;
    console.log('Log service initialized');
  }

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

      // Vérification rapide des logs activés et de l'initialisation
      if (!this.initialized || !this.client) {
        console.log(`[Log] ${type.toUpperCase()} - ${content}`);
        return;
      }

      const logData = await this.getLog(guildId);
      if (!this.isLoggingEnabled(logData)) {
        console.log(`[Log] ${type.toUpperCase()} - ${content}`);
        return;
      }

      // Récupération du canal de logs
      const logChannel = await this.getLogChannel(guildId, logData?.channel || '');
      if (!logChannel) {
        console.log(`[Log] ${type.toUpperCase()} - ${content}`);
        return;
      }

      // Préparation de l'embed
      const color = this.getColorForType(type);
      const embedTitle = title || this.getTitleForType(type);
      
      const embed = new EmbedBuilder()
        .setTitle(embedTitle)
        .setDescription(content)
        .setColor(color);
      
      if (timestamp) {
        embed.setTimestamp();
      }
      
      if (feature) {
        embed.setAuthor({ name: `Feature: ${feature}` });
      }
      
      if (footer) {
        embed.setFooter({ text: footer });
      } else if (file && line) {
        embed.setFooter({ text: `${file}:${line}` });
      }

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
    if (!this.client) return null;
    
    try {
      const channel = await this.client.channels.fetch(channelId);
      return channel && channel instanceof TextChannel ? channel : null;
    } catch (error) {
      console.error(`Error fetching log channel: ${error}`);
      return null;
    }
  }

  private static getColorForType(type: LogType): number {
    switch (type) {
      case 'info': return COLORS.INFO;
      case 'warning': return COLORS.WARNING;
      case 'error': return COLORS.ERROR;
      case 'success': return COLORS.SUCCESS;
      case 'debug': return 0x7289DA; // Discord blueish color
      default: return COLORS.INFO;
    }
  }

  private static getTitleForType(type: LogType): string {
    const titles: Record<LogType, string> = {
      info: 'Information',
      warning: 'Avertissement',
      error: 'Erreur',
      success: 'Succès',
      debug: 'Debug'
    };
    return titles[type] || 'Log';
  }
} 
import { TextChannel, Guild } from 'discord.js';
import { GuildService } from '../../database/services/GuildService';
import { BotClient } from '../BotClient';
import { EmbedUtils } from '../utils/EmbedUtils';

export type LogType = 'info' | 'warning' | 'error' | 'success' | 'debug';
export type LogFeature = 'birthday' | 'welcome' | 'moderation' | 'games' | 'system' | string;

interface LogOptions {
  feature?: LogFeature;
  title?: string;
  timestamp?: boolean;
  footer?: string;
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
      const { feature, title, timestamp = true, footer } = options;

      // Vérification rapide des logs activés
      const guildData = await GuildService.getGuildById(guildId);
      console.log(`[LogService] Guild data:`, {
        exists: !!guildData,
        logsEnabled: guildData?.features?.logs?.enabled,
        logChannel: guildData?.features?.logs?.channel
      });

      if (!this.isLoggingEnabled(guildData)) {
        return;
      }

      // Récupération du canal de logs
      const logChannel = await this.getLogChannel(guildId, guildData.features.logs.channel);
      console.log(`[LogService] Log channel found:`, !!logChannel);
      
      if (!logChannel) {
        console.log(`[LogService] Could not find log channel ${guildData.features.logs.channel} in guild ${guildId}`);
        return;
      }

      // Création de l'embed
      const embed = this.createLogEmbed(type, content, title, feature, timestamp, footer);

      // Envoi du log
      await logChannel.send({ embeds: [embed] });
      console.log(`[LogService] Successfully sent ${type} log to channel ${logChannel.id}`);
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

  private static createLogEmbed(
    type: LogType,
    content: string,
    customTitle?: string,
    feature?: LogFeature,
    timestamp: boolean = true,
    footer?: string
  ) {
    const title = customTitle || this.TITLES[type];
    const embed = EmbedUtils.createSimpleEmbed(
      title,
      content,
      this.COLORS[type],
      feature
    );

    if (timestamp) {
      embed.setTimestamp();
    }

    if (footer) {
      embed.setFooter({ text: footer });
    }

    return embed;
  }
} 
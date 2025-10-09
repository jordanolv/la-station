import { TextChannel, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../bot/client';
import { GuildService } from '../../features/discord/services/guild.service';

class LogEmbed extends EmbedBuilder {
  constructor(type: 'info' | 'success' | 'warning' | 'error', message: string, options?: { feature?: string, title?: string }) {
    super();
    
    const configs = {
      info: { defaultTitle: 'ℹ️ Information', color: 0x3498db },
      success: { defaultTitle: '✅ Succès', color: 0x27ae60 },
      warning: { defaultTitle: '⚠️ Avertissement', color: 0xf39c12 },
      error: { defaultTitle: '❌ Erreur', color: 0xe74c3c }
    };
    
    const config = configs[type];
    this.setTitle(options?.title || config.defaultTitle)
        .setDescription(message)
        .setColor(config.color)
        .setTimestamp();
        
    if (options?.feature) {
      this.setFooter({ text: `Feature: ${options.feature}` });
    }
  }
}

export class LogService {

  /**
   * Configure le channel de logs
   */
  static async setLogsChannel(guildId: string, channelId: string): Promise<void> {
    const guild = await GuildService.getOrCreateGuild(guildId);

    if (!guild.config.channels) {
      guild.config.channels = {};
    }

    // Stocker comme objet simple avec la clé 'logs'
    (guild.config.channels as any).logs = channelId;

    await guild.save();
  }

  /**
   * Récupère le channel de logs configuré
   */
  static async getLogsChannelId(guildId: string, guildName?: string): Promise<string | null> {
    const guild = await GuildService.getOrCreateGuild(guildId, guildName);

    // Récupérer le channel de logs depuis l'objet channels
    return guild.config.channels?.logs || null;
  }

  /**
   * Envoie un embed dans le canal de logs
   */
  static async sendEmbed(client: BotClient, guildId: string, embed: EmbedBuilder): Promise<void> {
    try {
      const channelId = await this.getLogsChannelId(guildId);
      if (!channelId) return;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;

      const logChannel = guild.channels.cache.get(channelId) as TextChannel;
      if (!logChannel) return;

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`[LogService] Error sending log:`, error);
    }
  }

  /**
   * Log un message d'information
   */
  static async info(client: BotClient, guildId: string, message: string, options?: { feature?: string, title?: string }): Promise<void> {
    const embed = new LogEmbed('info', message, options);
    await this.sendEmbed(client, guildId, embed);
  }

  /**
   * Log un message de succès
   */
  static async success(client: BotClient, guildId: string, message: string, options?: { feature?: string, title?: string }): Promise<void> {
    const embed = new LogEmbed('success', message, options);
    await this.sendEmbed(client, guildId, embed);
  }

  /**
   * Log un message d'avertissement
   */
  static async warning(client: BotClient, guildId: string, message: string, options?: { feature?: string, title?: string }): Promise<void> {
    const embed = new LogEmbed('warning', message, options);
    await this.sendEmbed(client, guildId, embed);
  }

  /**
   * Log un message d'erreur
   */
  static async error(client: BotClient, guildId: string, message: string, options?: { feature?: string, title?: string }): Promise<void> {
    const embed = new LogEmbed('error', message, options);
    await this.sendEmbed(client, guildId, embed);
  }

  /**
   * Log un message modifié sur Discord
   */
  static async logMessageEdit(
    client: BotClient,
    guildId: string,
    userId: string,
    username: string,
    channelId: string,
    messageId: string,
    oldContent: string,
    newContent: string
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('📝 Message modifié')
      .setColor(0xf39c12)
      .addFields(
        { name: 'Utilisateur', value: `<@${userId}> (${username})`, inline: true },
        { name: 'Channel', value: `<#${channelId}>`, inline: true },
        { name: 'Message ID', value: messageId, inline: true },
        { name: 'Ancien contenu', value: oldContent.slice(0, 1024) || '_Aucun contenu_', inline: false },
        { name: 'Nouveau contenu', value: newContent.slice(0, 1024) || '_Aucun contenu_', inline: false }
      )
      .setTimestamp();

    await this.sendEmbed(client, guildId, embed);
  }

  /**
   * Log un message supprimé sur Discord
   */
  static async logMessageDelete(
    client: BotClient,
    guildId: string,
    userId: string | null,
    username: string | null,
    channelId: string,
    messageId: string,
    content: string
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🗑️ Message supprimé')
      .setColor(0xe74c3c)
      .addFields(
        { name: 'Utilisateur', value: userId ? `<@${userId}> (${username})` : 'Inconnu', inline: true },
        { name: 'Channel', value: `<#${channelId}>`, inline: true },
        { name: 'Message ID', value: messageId, inline: true },
        { name: 'Contenu', value: content.slice(0, 1024) || '_Aucun contenu_', inline: false }
      )
      .setTimestamp();

    await this.sendEmbed(client, guildId, embed);
  }
} 
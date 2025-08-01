import { EmbedBuilder, TextChannel } from 'discord.js';
import { GuildService } from '../../discord/services/guild.service';
import { BotClient } from '../../../bot/client';

export class LogsService {
  /**
   * Configure le channel de logs pour une guild
   */
  static async setLogsChannel(guildId: string, channelId: string): Promise<void> {
    try {
      const guild = await GuildService.getOrCreateGuild(guildId, '');
      if (!guild) return;

      // Mise à jour du channel de logs dans la configuration
      if (!guild.config.channels) {
        guild.config.channels = new Map();
      }
      guild.config.channels.set('logsChannel', channelId);
      
      await guild.save();
    } catch (error) {
      console.error('Erreur lors de la configuration du channel de logs:', error);
    }
  }

  /**
   * Récupère le channel de logs configuré pour une guild
   */
  static async getLogsChannel(guildId: string): Promise<string | null> {
    try {
      const guild = await GuildService.getOrCreateGuild(guildId, '');
      if (!guild?.config?.channels) return null;
      
      return guild.config.channels.get('logsChannel') || null;
    } catch (error) {
      console.error('Erreur lors de la récupération du channel de logs:', error);
      return null;
    }
  }

  /**
   * Log un message modifié
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
    try {
      const logsChannelId = await this.getLogsChannel(guildId);
      if (!logsChannelId) return;

      // Récupérer la guild depuis le client passé en paramètre
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;

      const logsChannel = guild.channels.cache.get(logsChannelId) as TextChannel;
      if (!logsChannel) return;

      const embed = new EmbedBuilder()
        .setTitle('📝 Message modifié')
        .setColor(0xffa500) // Orange
        .addFields(
          { name: 'Utilisateur', value: `<@${userId}> (${username})`, inline: true },
          { name: 'Channel', value: `<#${channelId}>`, inline: true },
          { name: 'Message ID', value: messageId, inline: true },
          { name: 'Ancien contenu', value: oldContent.slice(0, 1024) || '_Aucun contenu_', inline: false },
          { name: 'Nouveau contenu', value: newContent.slice(0, 1024) || '_Aucun contenu_', inline: false }
        )
        .setTimestamp();

      await logsChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur lors du log de modification de message:', error);
    }
  }

  /**
   * Log un message supprimé
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
    try {
      const logsChannelId = await this.getLogsChannel(guildId);
      if (!logsChannelId) return;

      // Récupérer la guild depuis le client passé en paramètre
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;

      const logsChannel = guild.channels.cache.get(logsChannelId) as TextChannel;
      if (!logsChannel) return;

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Message supprimé')
        .setColor(0xff0000) // Rouge
        .addFields(
          { name: 'Utilisateur', value: userId ? `<@${userId}> (${username})` : 'Inconnu', inline: true },
          { name: 'Channel', value: `<#${channelId}>`, inline: true },
          { name: 'Message ID', value: messageId, inline: true },
          { name: 'Contenu', value: content.slice(0, 1024) || '_Aucun contenu_', inline: false }
        )
        .setTimestamp();

      await logsChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur lors du log de suppression de message:', error);
    }
  }
}
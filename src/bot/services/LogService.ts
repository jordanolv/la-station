import { TextChannel } from 'discord.js';
import { GuildService } from '../../database/services/GuildService';
import { BotClient } from '../BotClient';
import { EmbedUtils } from '../utils/EmbedUtils';

export class LogService {
  static async sendLog(
    guildId: string,
    content: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info'
  ) {
    try {
      const guildData = await GuildService.getGuildById(guildId);
      if (!guildData?.features?.logs?.enabled || !guildData?.features?.logs?.channel) {
        return;
      }

      const guild = BotClient.getInstance().guilds.cache.get(guildId);
      if (!guild) return;

      const logChannel = guild.channels.cache.get(guildData.features.logs.channel) as TextChannel;
      if (!logChannel) return;

      // Titre en fonction du type
      const title = {
        info: 'Information',
        warning: 'Avertissement',
        error: 'Erreur',
        success: 'Succès'
      }[type];

      // Création de l'embed en fonction du type
      const embed = {
        info: () => EmbedUtils.createSimpleEmbed(title, content, EmbedUtils.Colors.INFO),
        warning: () => EmbedUtils.createWarningEmbed(title, content),
        error: () => EmbedUtils.createErrorEmbed(title, content),
        success: () => EmbedUtils.createSuccessEmbed(title, content)
      }[type]();

      await logChannel.send({
        embeds: [embed]
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du log:', error);
    }
  }
} 
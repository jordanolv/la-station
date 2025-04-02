import { TextChannel } from 'discord.js';
import { GuildService } from './GuildService';
import { BotClient } from '../../bot/BotClient';

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

      // Emoji en fonction du type
      const emoji = {
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌',
        success: '✅'
      }[type];

      await logChannel.send({
        content: `${emoji} ${content}`
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du log:', error);
    }
  }
} 
import { TextChannel, Client } from 'discord.js';
import GuildModel from '../../../database/models/Guild';

export class LogService {
  static async sendLog(client: Client, guildId: string, message: string, type: 'info' | 'warning' | 'error' = 'info') {
    const guild = await GuildModel.findOne({ guildId });
    if (!guild?.features.logs.enabled || !guild?.features.logs.channel) return;

    const channel = await client.channels.fetch(guild.features.logs.channel);
    if (!(channel instanceof TextChannel)) return;

    const emoji = {
      info: '📝',
      warning: '⚠️',
      error: '❌'
    }[type];

    await channel.send(`${emoji} ${message}`);
  }
} 
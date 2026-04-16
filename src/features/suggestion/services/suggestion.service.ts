import { ChannelType, Message } from 'discord.js';
import { AppConfigService } from '../../discord/services/app-config.service';

const UPVOTE_EMOJI = '👍';
const DOWNVOTE_EMOJI = '👎';
const THREAD_AUTO_ARCHIVE_MINUTES = 10080;

export class SuggestionService {
  static async handleMessage(message: Message): Promise<void> {
    if (message.author?.bot) return;
    if (!message.guild) return;
    if (message.system) return;

    const config = await AppConfigService.getOrCreateConfig();
    const suggestion = config.features?.suggestion as any;
    if (!suggestion?.enabled) return;
    const channels: string[] = Array.isArray(suggestion.channels) ? suggestion.channels : [];
    const legacyChannelId: string | undefined = suggestion.channelId;
    const isAllowed = channels.includes(message.channelId) || legacyChannelId === message.channelId;
    if (!isAllowed) return;

    if (message.channel.type !== ChannelType.GuildText && message.channel.type !== ChannelType.GuildAnnouncement) {
      return;
    }

    try {
      await message.react(UPVOTE_EMOJI);
      await message.react(DOWNVOTE_EMOJI);
    } catch (err) {
      console.error('[Suggestion] Erreur ajout réactions:', err);
    }

    try {
      const name = this.buildThreadName(message);
      await message.startThread({
        name,
        autoArchiveDuration: THREAD_AUTO_ARCHIVE_MINUTES,
      });
    } catch (err) {
      console.error('[Suggestion] Erreur création thread:', err);
    }
  }

  private static buildThreadName(message: Message): string {
    const raw = message.content?.replace(/\s+/g, ' ').trim() ?? '';
    const base = raw.length > 0 ? raw : `Suggestion de ${message.author.username}`;
    const prefix = '💬 ';
    const maxLength = 100 - prefix.length;
    const truncated = base.length > maxLength ? `${base.slice(0, maxLength - 1)}…` : base;
    return `${prefix}${truncated}`;
  }
}

import { Events, MessageReaction, User } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ChatGamingService } from '../../chat-gaming/services/chat-gaming.service';
import { PartyService } from '../../party/services/party.service';
import { GamesForumService } from '../services/games-forum.service';

export default {
  name: Events.MessageReactionAdd,
  once: false,

  async execute(client: BotClient, reaction: MessageReaction, user: User) {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        return;
      }
    }

    if (!reaction.message.guild) return;

    await ChatGamingService.handleReactionAdd(reaction, user);
    await GamesForumService.handleBellReaction(reaction, user, true);
    if (reaction.emoji.name === '🎉') {
await PartyService.handleReactionAdd(client, reaction.message.id, user.id);
    }
  }
};

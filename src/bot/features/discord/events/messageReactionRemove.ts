import { Events, User } from 'discord.js';
import { ChannelType } from "discord.js";
import { BotClient } from '../../../BotClient.js';
import { GuildService } from '../../../../database/services/GuildService.js';
import { GameService } from '../../../../database/services/GameService.js';

export default {
  name: Events.MessageReactionRemove,
  once: false,

  async execute(client: BotClient, reaction: any, user: User) {
    if (reaction.partial) {
      // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Something went wrong when fetching the message:', error);
        // Return as `reaction.message.author` may be undefined/null
        return;
      }
    }

    const guildData = await GuildService.getGuildById(reaction.message.guild.id);
    // const guildData = await client.database.fetchGuildById(reaction.message.guild.id);

    if (guildData) {
      const game = await GameService.findByMessageId(reaction.message.id);
      if (game) {
        client.emit('fg-removeRole', reaction, user, guildData);
      }
    }
  }
};

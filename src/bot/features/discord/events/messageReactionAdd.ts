import { Events, User } from 'discord.js';
import { ChannelType } from "discord.js";
import { BotClient } from '../../../BotClient.js';
import { GuildService } from '../../../../database/services/GuildService.js';
import { GameService } from '../../../../database/services/GameService.js';

export default {
  name: Events.MessageReactionAdd,
  once: false,

  async execute(client: BotClient, reaction: any, user: User) {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Something went wrong when fetching the message:', error);
        return;
      }
    }

    const guildData = await GuildService.getGuildById(reaction.message.guild.id);

    if (guildData) {
      const game = await GameService.findByMessageId(reaction.message.id);
      if (game) {
        client.emit('fg-addRole', reaction, user, guildData);
      }
    }
  }
};

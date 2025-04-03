const { Collection, ChannelType, Events, EmbedBuilder, PermissionsBitField } = require("discord.js");
import { AttachmentBuilder, ForumChannel, Guild } from "discord.js";
import { BotClient } from '../../../../BotClient';
import { GameService } from "../../../../../database/services/GameService";
import { IGame } from "../../../../../database/models/Game";
import { GuildService } from "../../../../../database/services/GuildService";

export default {
  name: 'gameCreate',
  once: false,

  async execute(client: BotClient, game: IGame, guild: Guild) {
    console.log('game');
    if (!guild) return;
    const guildData = await GuildService.getGuildById(guild.id);
    if (!guildData) return;

    const role = await guild?.roles.create({
      name: game.name,
      color: parseInt(game.color.replace('#', ''), 16),
      mentionable: true
    });

    if (!game.name || !game.description || !game.image) return;

    const attachment = new AttachmentBuilder('uploads/' + game.image)
      .setName('image.png');

    const embed = new EmbedBuilder()
      .setTitle(game.name)
      .setDescription(game.description)
      .setColor(game.color)
      .setImage('attachment://image.png')
      .setFooter({ text: 'Cliquez sur la cloche pour avoir le rôle du jeu !' });

    const channel = await guild.channels.fetch(guildData.features.chatGaming.channelId) as ForumChannel;

    const thread = await channel?.threads.create({
      name: game.name,
      message: { embeds: [embed], files: [attachment] },
      reason: 'Création d\'un jeu'
    });

    const firstMessage = await thread.fetchStarterMessage();
    if (firstMessage) {
      const reactAdd = await firstMessage.react('🔔');

      const gameAdd = await GameService.createGame({
        name: game.name,
        description: game.description,
        image: game.image,
        color: game.color,
        guildId: guild.id,
        threadId: thread.id,
        messageId: firstMessage.id,
        roleId: role.id,
      });

      await GameService.addReaction(
        gameAdd._id,
        firstMessage.id,
        reactAdd.emoji.id || reactAdd.emoji.name,
        role.id
      );
    }
  }
};
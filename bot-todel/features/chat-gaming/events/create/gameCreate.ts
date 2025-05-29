const { Collection, ChannelType, Events, EmbedBuilder, PermissionsBitField } = require("discord.js");
import { AttachmentBuilder, ForumChannel, Guild } from "discord.js";
import { BotClient } from '../../../../BotClient';
import { GameService } from "../../../../../database/services/GameService";
import { IGame } from "../../../../../database/models/GuildGame";
import { GuildService } from "../../../../../database/services/GuildService";
import GameModel from "../../../../../database/models/GuildGame";

export default {
  name: 'gameCreate',
  once: false,

  async execute(client: BotClient, game: IGame, guild: Guild) {
    
    if (!game.name || !game.description || !game.image) return;

    if (!guild) return;
    const guildGameData = await GuildService.getGuildById(guild.id);
    if (!guildData) return;

    const attachment = new AttachmentBuilder('uploads/' + game.image)
      .setName('image.png');

    const embed = new EmbedBuilder()
      .setTitle(game.name)
      .setDescription(game.description)
      .setColor(game.color)
      .setImage('attachment://image.png')
      .setFooter({ text: 'Cliquez sur la cloche pour avoir le rôle du jeu !' });

    const channel = await guild.channels.fetch() as ForumChannel;

    const createdRole = await guild?.roles.create({
      name: game.name,
      color: parseInt(game.color.replace('#', ''), 16),
      mentionable: true
    });

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
        roleId: createdRole.id,
      });

      await GameService.addReaction(
        gameAdd._id,
        firstMessage.id,
        reactAdd.emoji.id || reactAdd.emoji.name,
        createdRole.id
      );
    }
  }
};
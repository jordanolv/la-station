import { Guild, ChannelType, EmbedBuilder, ThreadAutoArchiveDuration, TextChannel, MessageReaction, User, ForumChannel, ThreadChannel, AttachmentBuilder } from 'discord.js';
import ChatGamingModel from './chatGaming.model';
import GameModel, { IGame } from './game.model';
import path from 'path';

export class ChatGamingService {
  
  // ===== GAME CRUD OPERATIONS =====
  static async getGameById(id: string): Promise<IGame | null> {
    return GameModel.findById(id);
  }

  static async getGamesByGuild(guildId: string): Promise<IGame[]> {
    return GameModel.find({ guildId });
  }

  static async createGame(
    gameData: {
      name: string,
      guildId: string,
      description?: string,
      image?: string,
      color?: string,
      threadId?: string,
      messageId?: string,
      roleId?: string
    }
  ): Promise<IGame> {
    return GameModel.create(gameData);
  }

  static async updateGame(
    id: string,
    updates: Partial<IGame>
  ): Promise<IGame | null> {
    return GameModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );
  }

  static async deleteGame(id: string): Promise<IGame | null> {
    return GameModel.findByIdAndDelete(id);
  }

  static async findByThreadId(threadId: string): Promise<IGame | null> {
    return GameModel.findOne({ threadId });
  }

  static async findByMessageId(messageId: string): Promise<IGame | null> {
    return GameModel.findOne({ messageId });
  }

  
  static async getChatGaming(guildId: string) {
    return ChatGamingModel.findOne({ guildId });
  }

  static async getOrCreateChatGaming(guildId: string, enabled: boolean = false) {
    const existing = await this.getChatGaming(guildId);
    if (existing) return existing;
    
    return ChatGamingModel.create({
      guildId,
      enabled,
      channelId: null
    });
  }

  // ===== DISCORD INTEGRATION =====
  /**
   * Crée un jeu avec thread et rôle Discord
   */
  static async createGameInDiscord(game: IGame, guild: Guild): Promise<void> {
    try {
      const chatGamingSettings = await ChatGamingModel.findOne({ guildId: guild.id });
      if (!chatGamingSettings?.enabled || !chatGamingSettings.channelId) {
        console.log(`Chat gaming not enabled or channel not set for guild ${guild.id}`);
        return;
      }

      const channel = guild.channels.cache.get(chatGamingSettings.channelId);
      if (!channel || !(channel instanceof ForumChannel)) {
        console.error(`Channel ${chatGamingSettings.channelId} not found or not a forum channel`);
        return;
      }

      const gameRole = await guild.roles.create({
        name: `🎮 ${game.name}`,
        color: game.color ? parseInt(game.color.replace('#', ''), 16) : 0x55CCFC,
        hoist: false,
        mentionable: true,
        reason: `Role created for game: ${game.name}`
      });

      const embed = new EmbedBuilder()
        .setTitle(`🎮 ${game.name}`)
        .setDescription(game.description || 'Nouveau jeu disponible!')
        .setColor(game.color ? parseInt(game.color.replace('#', ''), 16) : 0x55CCFC)
        .addFields({
          name: '🔔 Rejoindre le jeu',
          value: 'Réagis avec 🔔 pour obtenir le rôle et être notifié!',
          inline: false
        })
        .setTimestamp();

      let attachment: AttachmentBuilder | undefined;
      if (game.image) {
        const imagePath = game.image.startsWith('/uploads/') 
          ? path.join(process.cwd(), game.image.replace('/uploads/', 'uploads/'))
          : game.image;
        attachment = new AttachmentBuilder(imagePath)
          .setName('image.png');
        embed.setImage('attachment://image.png');
      }

      const thread = await channel?.threads.create({
        name: `🎮 ${game.name}`,
        message: { 
          embeds: [embed], 
          files: attachment ? [attachment] : []
        },
        reason: `Thread created for game: ${game.name}`
      });

      const firstMessage = await thread?.fetchStarterMessage();
      await firstMessage?.react('🔔');

      await ChatGamingService.updateGame(
        game._id.toString(),
        {
          threadId: thread.id,
          messageId: firstMessage.id,
          roleId: gameRole.id
        }
      );

      console.log(`Game ${game.name} created with thread ${thread.id} and role ${gameRole.id}`);

    } catch (error) {
      console.error('Error creating game in Discord:', error);
    }
  }

  /**
   * Gère l'ajout d'une réaction pour obtenir un rôle de jeu
   */
  static async handleReactionAdd(reaction: MessageReaction, user: User): Promise<void> {
    try {
      if (user.bot) return;

      if (reaction.partial) {
        await reaction.fetch();
      }

      if (!reaction.message.guild) return;

      const guild = reaction.message.guild;
      const guildId = guild.id;

      const chatGamingSettings = await ChatGamingModel.findOne({ guildId });
      if (!chatGamingSettings?.enabled) return;

      if (reaction.emoji.name !== '🔔') return;

      const game = await ChatGamingService.findByMessageId(reaction.message.id);
      if (!game || !game.roleId) return;

      const member = await guild.members.fetch(user.id);
      if (!member) return;

      const role = guild.roles.cache.get(game.roleId);
      if (!role) {
        console.error(`Role ${game.roleId} not found for game ${game.name}`);
        return;
      }

      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);

        if (reaction.message.channel.isThread()) {
          const thread = reaction.message.channel as ThreadChannel;

          await thread.members.add(user.id);
        } 

        console.log(`Added role ${role.name} to ${member.user.tag} for game ${game.name}`);
      }

    } catch (error) {
      console.error('Error handling game reaction add:', error);
    }
  }

  /**
   * Gère la suppression d'une réaction pour retirer un rôle de jeu
   */
  static async handleReactionRemove(reaction: MessageReaction, user: User): Promise<void> {
    try {
      if (user.bot) return;

      if (reaction.partial) {
        await reaction.fetch();
      }

      if (!reaction.message.guild) return;

      const guild = reaction.message.guild;
      const guildId = guild.id;

      const chatGamingSettings = await ChatGamingModel.findOne({ guildId });
      if (!chatGamingSettings?.enabled) return;

      if (reaction.emoji.name !== '🔔') return;

      const game = await ChatGamingService.findByMessageId(reaction.message.id);
      if (!game || !game.roleId) return;

      const member = await guild.members.fetch(user.id);
      if (!member) return;

      const role = guild.roles.cache.get(game.roleId);
      if (!role) {
        console.error(`Role ${game.roleId} not found for game ${game.name}`);
        return;
      }

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);

        if (reaction.message.channel.isThread()) {
          const thread = reaction.message.channel as ThreadChannel;

          await thread.members.remove(user.id);
        } 
        console.log(`Removed role ${role.name} from ${member.user.tag} for game ${game.name}`);
      }

    } catch (error) {
      console.error('Error handling game reaction remove:', error);
    }
  }
}
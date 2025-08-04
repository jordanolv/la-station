import { Message, MessageReaction, User, Guild } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ChatGamingRepository } from './chatGaming.repository';
import { DiscordChatGamingService } from './discord.chatGaming.service';
import { ChatGamingValidator } from './chatGaming.validator';
import { ImageUploadService } from '../../../shared/services/ImageUploadService';
import { GuildService } from '../../discord/services/guild.service';
import GuildModel from '../../discord/models/guild.model';
import {
  CreateGameDTO,
  UpdateGameDTO,
  GameResponseDTO,
  ValidationError,
  NotFoundError
} from './chatGaming.types';
import { IChatGamingItem } from '../models/chatGamingItem.model';

// Cache en mémoire pour les rappels de rôle gaming
const lastGamingRoleReminders = new Map<string, number>();
const GAMING_ROLE_REMINDER_COOLDOWN = 24 * 60 * 60 * 1000; // 24 heures

export class ChatGamingService {
  private repository: ChatGamingRepository;
  private discordService: DiscordChatGamingService;
  
  constructor() {
    this.repository = new ChatGamingRepository();
    this.discordService = new DiscordChatGamingService();
  }

  private formatGameForFrontend(game: IChatGamingItem): GameResponseDTO {
    return {
      _id: game._id.toString(),
      name: game.name,
      description: game.description,
      image: game.image,
      color: game.color,
      guildId: game.guildId,
      threadId: game.threadId,
      messageId: game.messageId,
      roleId: game.roleId,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt
    };
  }

  // ===== GAME CRUD OPERATIONS =====
  async createGame(client: BotClient, data: CreateGameDTO): Promise<GameResponseDTO> {
    // Validation
    const validation = ChatGamingValidator.validateCreateGame(data);
    ChatGamingValidator.throwIfInvalid(validation);

    // Upload d'image si nécessaire
    const imageUrl = data.image ? await ImageUploadService.uploadGameImage(data.image as any) : undefined;

    // Créer l'événement en base
    const gameData = {
      name: data.name,
      description: data.description,
      image: imageUrl,
      color: data.color || '#55CCFC',
      guildId: data.guildId
    };

    const game = await this.repository.create(gameData);

    // Intégration Discord
    const chatGamingConfig = await this.getChatGamingConfig(data.guildId);
    if (chatGamingConfig?.enabled && chatGamingConfig.channelId) {
      try {
        const guild = client.guilds.cache.get(data.guildId);
        if (guild) {
          const discordData = await this.discordService.createGameInDiscord(game, guild, chatGamingConfig.channelId);
          await this.repository.updateDiscordInfo(game._id.toString(), discordData.threadId, discordData.messageId, discordData.roleId);
          
          // Récupérer le jeu mis à jour
          const updatedGame = await this.repository.findById(game._id.toString());
          return this.formatGameForFrontend(updatedGame!);
        }
      } catch (error) {
        console.error('Error creating game in Discord:', error);
      }
    }

    return this.formatGameForFrontend(game);
  }

  async updateGame(gameId: string, updates: UpdateGameDTO): Promise<GameResponseDTO> {
    const validation = ChatGamingValidator.validateUpdateGame(updates);
    ChatGamingValidator.throwIfInvalid(validation);

    const updateData: any = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.color) updateData.color = updates.color;
    if (updates.threadId) updateData.threadId = updates.threadId;
    if (updates.messageId) updateData.messageId = updates.messageId;
    if (updates.roleId) updateData.roleId = updates.roleId;
    
    if (updates.image) {
      const imageUrl = await ImageUploadService.uploadGameImage(updates.image as any);
      updateData.image = imageUrl;
    }

    const updatedGame = await this.repository.update(gameId, updateData);
    return this.formatGameForFrontend(updatedGame);
  }

  async getGameById(gameId: string): Promise<GameResponseDTO> {
    const game = await this.repository.findById(gameId);
    if (!game) {
      throw new NotFoundError('Jeu non trouvé');
    }
    return this.formatGameForFrontend(game);
  }

  async getGamesByGuild(guildId: string): Promise<GameResponseDTO[]> {
    const games = await this.repository.findByGuild(guildId);
    return games.map(game => this.formatGameForFrontend(game));
  }

  async deleteGame(client: BotClient, gameId: string): Promise<void> {
    const game = await this.repository.findById(gameId);
    if (!game) {
      throw new NotFoundError('Jeu non trouvé');
    }

    // Nettoyer Discord
    await this.discordService.cleanupGameFromDiscord(client, game);

    // Supprimer de la base
    const success = await this.repository.delete(gameId);
    if (!success) {
      throw new NotFoundError('Jeu non trouvé');
    }
  }

  async getChatGamingConfig(guildId: string) {
    const guild = await GuildModel.findOne({ guildId });
    return guild?.features?.chatGaming || null;
  }

  async getOrCreateChatGamingConfig(guildId: string, enabled: boolean = false) {
    let guild = await GuildModel.findOne({ guildId });
    if (!guild || !guild.features?.chatGaming) {
      guild = await GuildModel.findOneAndUpdate(
        { guildId },
        {
          $set: {
            'features.chatGaming': {
              enabled,
              channelId: ''
            }
          }
        },
        { new: true, upsert: true }
      );
    }
    return guild.features.chatGaming!;
  }

  // ===== STATIC HELPERS FOR OTHER FEATURES =====
  static async getGameById(id: string): Promise<IChatGamingItem | null> {
    const service = new ChatGamingService();
    return service.repository.findById(id);
  }

  static async getGamesByGuild(guildId: string): Promise<IChatGamingItem[]> {
    const service = new ChatGamingService();
    return service.repository.findByGuild(guildId);
  }

  // ===== STATIC EVENT HANDLERS =====
  static async handleReactionAdd(reaction: MessageReaction, user: User): Promise<void> {
    const discordService = new DiscordChatGamingService();
    await discordService.handleReactionAdd(reaction, user);
  }

  static async handleReactionRemove(reaction: MessageReaction, user: User): Promise<void> {
    const discordService = new DiscordChatGamingService();
    await discordService.handleReactionRemove(reaction, user);
  }

  static async checkAndRemindGamingRole(message: Message): Promise<void> {
    const service = new ChatGamingService();
    const chatGamingSettings = await service.getChatGamingConfig(message.guild?.id || '');
    if (!chatGamingSettings?.enabled) return;

    const discordService = new DiscordChatGamingService();
    await discordService.checkAndRemindGamingRole(message, lastGamingRoleReminders, GAMING_ROLE_REMINDER_COOLDOWN);
  }
}
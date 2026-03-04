import { Message, MessageReaction, User } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { ChatGamingRepository } from './chat-gaming.repository';
import { DiscordChatGamingService } from './discord.chat-gaming.service';
import { IChatGamingItem } from '../models/chat-gaming-item.model';
import AppConfigModel from '../../discord/models/app-config.model';

// Cache en mémoire pour les rappels de rôle gaming
const lastGamingRoleReminders = new Map<string, number>();
const GAMING_ROLE_REMINDER_COOLDOWN = 24 * 60 * 60 * 1000; // 24 heures

export class ChatGamingService {
  static async getChatGamingConfig() {
    const guild = await AppConfigModel.findOne({});
    return guild?.features?.chatGaming || null;
  }

  static async getGameById(id: string): Promise<IChatGamingItem | null> {
    return new ChatGamingRepository().findById(id);
  }

  static async getAllGames(): Promise<IChatGamingItem[]> {
    return new ChatGamingRepository().findAll();
  }

  static async createGame(
    client: BotClient,
    data: { name: string; description?: string; color?: string; image?: string },
  ): Promise<IChatGamingItem> {
    const repo = new ChatGamingRepository();
    const game = await repo.create({
      name: data.name,
      description: data.description,
      color: data.color ?? '#55CCFC',
      image: data.image,
    });

    const config = await this.getChatGamingConfig();
    if (config?.enabled && config.channelId) {
      try {
        const guild = client.guilds.cache.get(require('../../../shared/guild').getGuildId());
        if (guild) {
          const discordService = new DiscordChatGamingService();
          const discordData = await discordService.createGameInDiscord(game, guild, config.channelId);
          await repo.updateDiscordInfo(game._id.toString(), discordData.threadId, discordData.messageId, discordData.roleId);
          return (await repo.findById(game._id.toString()))!;
        }
      } catch (err) {
        console.error('[ChatGaming] Erreur création Discord:', err);
      }
    }

    return game;
  }

  static async updateGame(
    client: BotClient,
    gameId: string,
    data: { name?: string; description?: string; color?: string; image?: string },
  ): Promise<IChatGamingItem> {
    const repo = new ChatGamingRepository();
    const game = await repo.findById(gameId);
    if (!game) throw new Error('Jeu introuvable');

    // Construire les updates DB (on ne remplace l'image que si une nouvelle a été envoyée)
    const updates: Partial<IChatGamingItem> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.color !== undefined) updates.color = data.color;
    if (data.image !== undefined) updates.image = data.image;

    // Mettre à jour Discord (thread + embed + rôle)
    const discordService = new DiscordChatGamingService();
    const { threadCleared } = await discordService.updateGameInDiscord(client, game, data);
    if (threadCleared) {
      updates.threadId = undefined;
      updates.messageId = undefined;
      updates.roleId = undefined;
    }

    return repo.update(gameId, updates);
  }

  static async deleteGame(client: BotClient, gameId: string): Promise<void> {
    const repo = new ChatGamingRepository();
    const game = await repo.findById(gameId);
    if (!game) return;
    await new DiscordChatGamingService().cleanupGameFromDiscord(client, game);
    await repo.delete(gameId);
  }

  // ─── Event handlers ───────────────────────────────────────────────────────

  static async handleReactionAdd(reaction: MessageReaction, user: User): Promise<void> {
    await new DiscordChatGamingService().handleReactionAdd(reaction, user);
  }

  static async handleReactionRemove(reaction: MessageReaction, user: User): Promise<void> {
    await new DiscordChatGamingService().handleReactionRemove(reaction, user);
  }

  static async checkAndRemindGamingRole(message: Message): Promise<void> {
    const config = await this.getChatGamingConfig();
    if (!config?.enabled) return;
    await new DiscordChatGamingService().checkAndRemindGamingRole(
      message,
      lastGamingRoleReminders,
      GAMING_ROLE_REMINDER_COOLDOWN,
    );
  }
}

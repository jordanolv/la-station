import LFMRequestModel, { ILFMRequest } from '../models/lfm-request.model';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  User,
} from 'discord.js';
import GameDBService from './game-db.service';

export interface CreateLFMRequestDTO {
  userId: string;
  username: string;
  guildId: string;
  game: string;
  numberOfMates: number;
  rank?: string;
  gameMode?: string;
  type?: string;
  sessionTime?: string;
  description?: string;
  gameRoleId?: string;
}

export class LFMService {
  /**
   * Create a new LFM request
   */
  async createRequest(data: CreateLFMRequestDTO): Promise<ILFMRequest> {
    // Cancel any existing open requests from the same user in the same guild
    await this.cancelUserRequests(data.userId, data.guildId);

    const request = await LFMRequestModel.create({
      ...data,
      status: 'open',
      createdAt: new Date(),
      interestedUsers: [data.userId], // Auto-add creator to the lobby
    });

    return request;
  }

  /**
   * Get an active LFM request by ID
   */
  async getRequest(requestId: string): Promise<ILFMRequest | null> {
    return LFMRequestModel.findById(requestId);
  }

  /**
   * Get all open LFM requests for a guild
   */
  async getOpenRequests(guildId: string): Promise<ILFMRequest[]> {
    return LFMRequestModel.find({
      guildId,
      status: 'open',
    }).sort({ createdAt: -1 });
  }

  /**
   * Get user's active requests in a guild
   */
  async getUserActiveRequests(userId: string, guildId: string): Promise<ILFMRequest[]> {
    return LFMRequestModel.find({
      userId,
      guildId,
      status: { $in: ['open', 'in_progress'] },
    });
  }

  /**
   * Add a user to the interested users list
   */
  async addInterestedUser(requestId: string, userId: string): Promise<ILFMRequest | null> {
    return LFMRequestModel.findByIdAndUpdate(
      requestId,
      {
        $addToSet: { interestedUsers: userId },
        updatedAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Remove a user from the interested users list
   */
  async removeInterestedUser(requestId: string, userId: string): Promise<ILFMRequest | null> {
    return LFMRequestModel.findByIdAndUpdate(
      requestId,
      {
        $pull: { interestedUsers: userId },
        updatedAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Update request status
   */
  async updateStatus(
    requestId: string,
    status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<ILFMRequest | null> {
    return LFMRequestModel.findByIdAndUpdate(
      requestId,
      {
        status,
        updatedAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Update message ID for a request
   */
  async updateMessageInfo(
    requestId: string,
    messageId: string,
    channelId: string,
    threadId?: string
  ): Promise<ILFMRequest | null> {
    return LFMRequestModel.findByIdAndUpdate(
      requestId,
      {
        messageId,
        channelId,
        threadId,
        updatedAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Cancel all active requests from a user in a guild
   */
  async cancelUserRequests(userId: string, guildId: string): Promise<void> {
    await LFMRequestModel.updateMany(
      {
        userId,
        guildId,
        status: { $in: ['open', 'in_progress'] },
      },
      {
        status: 'cancelled',
        updatedAt: new Date(),
      }
    );
  }

  /**
   * Delete a request
   */
  async deleteRequest(requestId: string): Promise<void> {
    await LFMRequestModel.findByIdAndDelete(requestId);
  }

  /**
   * Create Discord embed for LFM request
   */
  createLFMEmbed(request: ILFMRequest, user: User, gameColor?: string, gameBanner?: string): EmbedBuilder {
    const progressBar = this.createProgressBar(request.interestedUsers?.length || 0, request.numberOfMates);

    // Create title with game abbreviation and type
    const gameAbbr = this.getGameAbbreviation(request.game);
    const typeText = request.type || 'Casual';
    const title = `Nouveau Lobby sur ${gameAbbr} en ${typeText}`;

    // Build description with optional description text above progress bar
    let description = '';
    if (request.description) {
      description += `${request.description}\n\n`;
    }
    description += progressBar;

    const embed = new EmbedBuilder()
      .setColor((gameColor as any) || '#5865F2')
      .setTitle(title)
      .setDescription(description)
      .setAuthor({
        name: user.username,
        iconURL: user.displayAvatarURL(),
        url: 'https://discord.com'
      })
      .setThumbnail(user.displayAvatarURL({ size: 256 }));

    // Add fields
    const fields: Array<{ name: string; value: string; inline: boolean }> = [];

    // Session time
    if (request.sessionTime) {
      fields.push({
        name: '🕐 Heure',
        value: request.sessionTime,
        inline: true
      });
    }

    // Game Mode (for games like Rocket League: 2v2, 3v3, etc.)
    if (request.gameMode) {
      fields.push({
        name: '⚽ Mode',
        value: request.gameMode,
        inline: true
      });
    }

    // Rank if specified (only for Ranked type)
    if (request.rank) {
      fields.push({
        name: '⭐ Rank',
        value: request.rank,
        inline: true
      });
    }

    embed.addFields(fields);

    // Add game banner if available
    if (gameBanner) {
      embed.setImage(gameBanner);
    }

    // Add interested users list
    if (request.interestedUsers && request.interestedUsers.length > 0) {
      const interestedList = request.interestedUsers
        .map((id, index) => `${index + 1}. <@${id}>`)
        .join('\n');

      embed.addFields({
        name: `👥 Joueurs (${request.interestedUsers.length}/${request.numberOfMates})`,
        value: interestedList,
        inline: false,
      });
    }

    return embed;
  }

  /**
   * Create a progress bar for the number of interested users
   */
  private createProgressBar(current: number, total: number): string {
    const filled = Math.min(current, total);
    const empty = Math.max(total - current, 0);
    const filledBar = '🟦'.repeat(filled);
    const emptyBar = '⬜'.repeat(empty);
    return `${filledBar}${emptyBar} **${current}/${total}**`;
  }

  /**
   * Create action row with buttons for LFM request
   */
  createLFMButtons(requestId: string, isOwner: boolean = false): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    // Always show join/leave buttons
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`lfm_join_${requestId}`)
        .setLabel('Participer')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎮'),
      new ButtonBuilder()
        .setCustomId(`lfm_leave_${requestId}`)
        .setLabel('Quitter')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('👋')
    );

    // Add delete button for owner
    if (isOwner) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`lfm_delete_${requestId}`)
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );
    }

    return row;
  }

  /**
   * Check if user has reached their request limit
   */
  async hasReachedLimit(userId: string, guildId: string, limit: number = 3): Promise<boolean> {
    const activeRequests = await this.getUserActiveRequests(userId, guildId);
    return activeRequests.length >= limit;
  }

  /**
   * Get requests statistics for a guild
   */
  async getGuildStats(guildId: string): Promise<{
    total: number;
    open: number;
    completed: number;
  }> {
    const [total, open, completed] = await Promise.all([
      LFMRequestModel.countDocuments({ guildId }),
      LFMRequestModel.countDocuments({ guildId, status: 'open' }),
      LFMRequestModel.countDocuments({ guildId, status: 'completed' }),
    ]);

    return { total, open, completed };
  }

  /**
   * Get game abbreviation for display
   */
  private getGameAbbreviation(gameName: string): string {
    const abbreviations: { [key: string]: string } = {
      'League of Legends': 'LoL',
      'Rocket League': 'RL',
      'Valorant': 'Valo',
      'Counter-Strike 2': 'CS2',
      'Teamfight Tactics': 'TFT',
    };

    return abbreviations[gameName] || gameName;
  }
}

export default new LFMService();

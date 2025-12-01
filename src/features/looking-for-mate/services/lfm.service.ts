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
  description?: string;
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
    channelId: string
  ): Promise<ILFMRequest | null> {
    return LFMRequestModel.findByIdAndUpdate(
      requestId,
      {
        messageId,
        channelId,
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
    const embed = new EmbedBuilder()
      .setColor((gameColor as any) || '#00ff00')
      .setTitle('🎮 Looking For Mate')
      .setDescription(request.description || 'Aucune description fournie')
      .setAuthor({
        name: user.username,
        iconURL: user.displayAvatarURL(),
      })
      .addFields(
        { name: '🎯 Jeu', value: request.game, inline: true },
        { name: '👥 Nombre de joueurs recherchés', value: request.numberOfMates.toString(), inline: true },
        { name: '⭐ Rank/Niveau', value: request.rank || 'Non spécifié', inline: true },
        {
          name: '👤 Créé par',
          value: `<@${request.userId}>`,
          inline: true,
        },
        {
          name: '📊 Statut',
          value: this.getStatusEmoji(request.status),
          inline: true,
        }
      )
      .setTimestamp(request.createdAt)
      .setFooter({ text: `ID: ${request._id}` });

    // Add game banner if available
    if (gameBanner) {
      embed.setImage(gameBanner);
    }

    // Add interested users if any
    if (request.interestedUsers && request.interestedUsers.length > 0) {
      const interestedList = request.interestedUsers.map((id) => `<@${id}>`).join(', ');
      embed.addFields({
        name: `✋ Joueurs intéressés (${request.interestedUsers.length})`,
        value: interestedList,
        inline: false,
      });
    }

    return embed;
  }

  /**
   * Create action row with buttons for LFM request
   */
  createLFMButtons(requestId: string, isOwner: boolean = false): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (!isOwner) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`lfm_join_${requestId}`)
          .setLabel('Je suis intéressé !')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✋'),
        new ButtonBuilder()
          .setCustomId(`lfm_leave_${requestId}`)
          .setLabel('Plus intéressé')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❌')
      );
    } else {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`lfm_complete_${requestId}`)
          .setLabel('Groupe complet')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`lfm_cancel_${requestId}`)
          .setLabel('Annuler')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🚫')
      );
    }

    return row;
  }

  /**
   * Get status emoji
   */
  private getStatusEmoji(status: string): string {
    const statusMap: Record<string, string> = {
      open: '🟢 Ouvert',
      in_progress: '🟡 En cours',
      completed: '✅ Complet',
      cancelled: '🔴 Annulé',
    };
    return statusMap[status] || status;
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
}

export default new LFMService();

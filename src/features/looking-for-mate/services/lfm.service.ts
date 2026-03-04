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
  async createRequest(data: CreateLFMRequestDTO): Promise<ILFMRequest> {
    await this.cancelUserRequests(data.userId);

    const request = await LFMRequestModel.create({
      ...data,
      status: 'open',
      createdAt: new Date(),
      interestedUsers: [data.userId],
    });

    return request;
  }

  async getRequest(requestId: string): Promise<ILFMRequest | null> {
    return LFMRequestModel.findById(requestId);
  }

  async getOpenRequests(): Promise<ILFMRequest[]> {
    return LFMRequestModel.find({
      status: 'open',
    }).sort({ createdAt: -1 });
  }

  async getUserActiveRequests(userId: string): Promise<ILFMRequest[]> {
    return LFMRequestModel.find({
      userId,
      status: { $in: ['open', 'in_progress'] },
    });
  }

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

  async cancelUserRequests(userId: string): Promise<void> {
    await LFMRequestModel.updateMany(
      {
        userId,
        status: { $in: ['open', 'in_progress'] },
      },
      {
        status: 'cancelled',
        updatedAt: new Date(),
      }
    );
  }

  async deleteRequest(requestId: string): Promise<void> {
    await LFMRequestModel.findByIdAndDelete(requestId);
  }

  createLFMEmbed(request: ILFMRequest, user: User, gameColor?: string, gameBanner?: string): EmbedBuilder {
    const progressBar = this.createProgressBar(request.interestedUsers?.length || 0, request.numberOfMates);

    const gameAbbr = this.getGameAbbreviation(request.game);
    const typeText = request.type || 'Casual';
    const title = `Nouveau Lobby sur ${gameAbbr} en ${typeText}`;

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

    const fields: Array<{ name: string; value: string; inline: boolean }> = [];

    if (request.sessionTime) {
      fields.push({
        name: '🕐 Heure',
        value: request.sessionTime,
        inline: true
      });
    }

    if (request.gameMode) {
      fields.push({
        name: '⚽ Mode',
        value: request.gameMode,
        inline: true
      });
    }

    if (request.rank) {
      fields.push({
        name: '⭐ Rank',
        value: request.rank,
        inline: true
      });
    }

    embed.addFields(fields);

    if (gameBanner) {
      embed.setImage(gameBanner);
    }

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

  private createProgressBar(current: number, total: number): string {
    const filled = Math.min(current, total);
    const empty = Math.max(total - current, 0);
    const filledBar = '🟦'.repeat(filled);
    const emptyBar = '⬜'.repeat(empty);
    return `${filledBar}${emptyBar} **${current}/${total}**`;
  }

  createLFMButtons(requestId: string, isOwner: boolean = false): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

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

  async hasReachedLimit(userId: string, limit: number = 3): Promise<boolean> {
    const activeRequests = await this.getUserActiveRequests(userId);
    return activeRequests.length >= limit;
  }

  async getStats(): Promise<{
    total: number;
    open: number;
    completed: number;
  }> {
    const [total, open, completed] = await Promise.all([
      LFMRequestModel.countDocuments({}),
      LFMRequestModel.countDocuments({ status: 'open' }),
      LFMRequestModel.countDocuments({ status: 'completed' }),
    ]);

    return { total, open, completed };
  }

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

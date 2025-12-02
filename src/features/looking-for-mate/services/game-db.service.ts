import ChatGamingItemModel, { IChatGamingItem } from '../../chat-gaming/models/chatGamingItem.model';

export class GameDBService {
  /**
   * Get all games for a guild
   */
  async getGames(guildId: string): Promise<IChatGamingItem[]> {
    return ChatGamingItemModel.find({ guildId }).sort({ name: 1 });
  }

  /**
   * Get a game by name (case-insensitive)
   */
  async getGameByName(guildId: string, name: string): Promise<IChatGamingItem | null> {
    return ChatGamingItemModel.findOne({
      guildId,
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
  }

  /**
   * Get game color
   */
  async getGameColor(guildId: string, gameName: string): Promise<string> {
    const game = await this.getGameByName(guildId, gameName);
    return game?.color || '#00FF00';
  }

  /**
   * Get game image
   */
  async getGameImage(guildId: string, gameName: string): Promise<string | undefined> {
    const game = await this.getGameByName(guildId, gameName);
    return game?.image;
  }

  /**
   * Get game banner
   */
  async getGameBanner(guildId: string, gameName: string): Promise<string | undefined> {
    const game = await this.getGameByName(guildId, gameName);
    return game?.banner;
  }
}

export default new GameDBService();

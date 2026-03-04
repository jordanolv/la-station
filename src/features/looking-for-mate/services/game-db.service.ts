import ChatGamingItemModel, { IChatGamingItem } from '../../chat-gaming/models/chat-gaming-item.model';

export class GameDBService {
  async getGames(): Promise<IChatGamingItem[]> {
    return ChatGamingItemModel.find({}).sort({ name: 1 });
  }

  async getGameByName(name: string): Promise<IChatGamingItem | null> {
    return ChatGamingItemModel.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
  }

  async getGameColor(gameName: string): Promise<string> {
    const game = await this.getGameByName(gameName);
    return game?.color || '#00FF00';
  }

  async getGameImage(gameName: string): Promise<string | undefined> {
    const game = await this.getGameByName(gameName);
    return game?.image;
  }

  async getGameBanner(gameName: string): Promise<string | undefined> {
    const game = await this.getGameByName(gameName);
    return game?.banner;
  }
}

export default new GameDBService();

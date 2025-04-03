import GameModel, { IGame } from '../models/Game';

export class GameService {
  static async getGameById(id: string): Promise<IGame | null> {
    return GameModel.findOne({ id });
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
    return GameModel.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true }
    );
  }

  static async deleteGame(id: string): Promise<IGame | null> {
    return GameModel.findByIdAndDelete(id);
  }

  static async updateGameThread(
    id: string,
    threadId: string,
    messageId: string
  ): Promise<IGame | null> {
    return GameModel.findOneAndUpdate(
      { id },
      { 
        $set: { 
          threadId,
          messageId
        }
      },
      { new: true }
    );
  }

  static async setGameRole(
    id: string,
    roleId: string
  ): Promise<IGame | null> {
    return GameModel.findOneAndUpdate(
      { id },
      { $set: { roleId } },
      { new: true }
    );
  }

  static async findByThreadId(threadId: string): Promise<IGame | null> {
    return GameModel.findOne({ threadId });
  }

  static async findByMessageId(messageId: string): Promise<IGame | null> {
    return GameModel.findOne({ messageId });
  }

  static async addReaction(
    gameId: string,
    messageId: string,
    emoji: string,
    roleId: string
  ): Promise<IGame | null> {
    return GameModel.findOneAndUpdate(
      { _id: gameId },
      { 
        $push: { 
          reactions: {
            messageId,
            emoji,
            roleId
          }
        }
      },
      { new: true }
    );
  }
} 
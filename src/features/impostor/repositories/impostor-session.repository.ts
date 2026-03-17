import ImpostorSessionModel, { IImpostorSession } from '../models/impostor-session.model';

export class ImpostorSessionRepository {
  static async create(data: {
    hostId: string;
    hostUsername: string;
    gameId: string;
    gameName: string;
    numberOfGames: number;
    challengesPerGame: number;
  }): Promise<IImpostorSession> {
    return ImpostorSessionModel.create({
      ...data,
      players: [],
      currentGame: 0,
      status: 'lobby',
    });
  }

  static async findById(id: string): Promise<IImpostorSession | null> {
    return ImpostorSessionModel.findById(id).exec();
  }

  static async save(session: IImpostorSession): Promise<IImpostorSession> {
    return session.save();
  }

  static async updateMessageInfo(id: string, messageId: string, channelId: string): Promise<void> {
    await ImpostorSessionModel.findByIdAndUpdate(id, { messageId, channelId });
  }
}

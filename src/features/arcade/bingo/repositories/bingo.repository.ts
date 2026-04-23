import BingoStateModel, { IBingoStateDoc } from '../models/bingo-state.model';

export class BingoRepository {
  static async get(): Promise<IBingoStateDoc | null> {
    return BingoStateModel.findOne();
  }

  static async getOrCreate(): Promise<IBingoStateDoc> {
    const existing = await this.get();
    if (existing) return existing;
    return BingoStateModel.create({});
  }

  static async setNextSpawn(date: Date | null): Promise<void> {
    const doc = await this.getOrCreate();
    if (date) {
      doc.nextSpawnAt = date;
    } else {
      doc.nextSpawnAt = undefined;
    }
    await doc.save();
  }

  static async setActive(params: {
    channelId: string;
    messageId: string;
    threadId: string;
    target: number;
    startedAt: Date;
  }): Promise<void> {
    const doc = await this.getOrCreate();
    doc.activeChannelId = params.channelId;
    doc.activeMessageId = params.messageId;
    doc.activeThreadId = params.threadId;
    doc.activeTarget = params.target;
    doc.activeStartedAt = params.startedAt;
    doc.activeLastGuesserId = undefined;
    doc.activeGuesses = [];
    doc.nextSpawnAt = undefined;
    await doc.save();
  }

  static async clearActive(): Promise<void> {
    await BingoStateModel.updateOne(
      {},
      {
        $unset: {
          activeChannelId: '',
          activeMessageId: '',
          activeThreadId: '',
          activeTarget: '',
          activeLastGuesserId: '',
          activeGuesses: '',
          activeStartedAt: '',
        },
      },
    );
  }

  static async setLastGuesser(userId: string): Promise<void> {
    await BingoStateModel.updateOne({}, { $set: { activeLastGuesserId: userId } });
  }

  static async registerGuess(userId: string, guess: number): Promise<IBingoStateDoc | null> {
    return BingoStateModel.findOneAndUpdate(
      {},
      {
        $set: { activeLastGuesserId: userId },
        $push: { activeGuesses: guess },
      },
      { new: true },
    );
  }
}

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
    bonusNumbers: number[];
    startedAt: Date;
  }): Promise<void> {
    const doc = await this.getOrCreate();
    doc.activeChannelId = params.channelId;
    doc.activeMessageId = params.messageId;
    doc.activeThreadId = params.threadId;
    doc.activeTarget = params.target;
    doc.activeBonusNumbers = params.bonusNumbers;
    doc.activeStartedAt = params.startedAt;
    doc.activeLastGuesserId = undefined;
    doc.activeGuesses = [];
    doc.activeGuessers = [];
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
          activeBonusNumbers: '',
          activeLastGuesserId: '',
          activeGuesses: '',
          activeGuessers: '',
          activeStartedAt: '',
        },
      },
    );
  }

  static async setLastGuesser(userId: string): Promise<void> {
    await BingoStateModel.updateOne({}, { $set: { activeLastGuesserId: userId } });
  }

  static async claimBonus(num: number): Promise<boolean> {
    const res = await BingoStateModel.updateOne(
      { activeBonusNumbers: num },
      { $pull: { activeBonusNumbers: num } },
    );
    return res.modifiedCount === 1;
  }

  static async registerGuess(userId: string, guess: number): Promise<IBingoStateDoc | null> {
    return BingoStateModel.findOneAndUpdate(
      {},
      {
        $set: { activeLastGuesserId: userId },
        $push: { activeGuesses: guess, activeGuessers: userId },
      },
      { new: true },
    );
  }
}

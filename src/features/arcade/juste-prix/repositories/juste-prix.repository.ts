import JustePrixStateModel, { IJustePrixStateDoc, JustePrixGuess } from '../models/juste-prix-state.model';

export class JustePrixRepository {
  static async getOrCreate(): Promise<IJustePrixStateDoc> {
    const existing = await JustePrixStateModel.findOne();
    if (existing) return existing;
    return JustePrixStateModel.create({});
  }

  static async get(): Promise<IJustePrixStateDoc | null> {
    return JustePrixStateModel.findOne();
  }

  static async setNextSpawn(date: Date | null): Promise<void> {
    await JustePrixStateModel.updateOne(
      {},
      date ? { $set: { nextSpawnAt: date } } : { $unset: { nextSpawnAt: '' } },
      { upsert: true },
    );
  }

  static async setActive(params: {
    threadId: string;
    messageId: string;
    target: number;
    endsAt: Date;
    announceMessageId?: string | null;
  }): Promise<void> {
    const doc = await this.getOrCreate();
    doc.activeThreadId = params.threadId;
    doc.activeMessageId = params.messageId;
    doc.activeTarget = params.target;
    doc.activeEndsAt = params.endsAt;
    doc.announceMessageId = params.announceMessageId ?? undefined;
    doc.guesses = {};
    doc.nextSpawnAt = undefined;
    doc.markModified('guesses');
    await doc.save();
  }

  static async setGuess(userId: string, value: number): Promise<void> {
    const guess: JustePrixGuess = { value, at: new Date() };
    await JustePrixStateModel.updateOne({}, { $set: { [`guesses.${userId}`]: guess } });
  }

  static async clearActive(): Promise<void> {
    await JustePrixStateModel.updateOne(
      {},
      {
        $unset: {
          activeThreadId: '',
          activeMessageId: '',
          activeTarget: '',
          activeEndsAt: '',
          guesses: '',
          announceMessageId: '',
        },
      },
    );
  }
}

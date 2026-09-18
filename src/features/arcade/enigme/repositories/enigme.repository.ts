import EnigmeStateModel, { IEnigmeStateDoc, Riddle } from '../models/enigme-state.model';

export class EnigmeRepository {
  static async get(): Promise<IEnigmeStateDoc | null> {
    return EnigmeStateModel.findOne();
  }

  static async getOrCreate(): Promise<IEnigmeStateDoc> {
    const existing = await this.get();
    if (existing) return existing;
    return EnigmeStateModel.create({});
  }

  static async setNextSpawn(date: Date | null): Promise<void> {
    await EnigmeStateModel.updateOne(
      {},
      date ? { $set: { nextSpawnAt: date } } : { $unset: { nextSpawnAt: '' } },
      { upsert: true },
    );
  }

  static async setActive(params: {
    threadId: string;
    messageId: string;
    riddle: Riddle;
    hintAt: Date;
    endsAt: Date;
    announceMessageId?: string | null;
  }): Promise<void> {
    const doc = await this.getOrCreate();
    doc.activeThreadId = params.threadId;
    doc.activeMessageId = params.messageId;
    doc.riddle = params.riddle;
    doc.startedAt = new Date();
    doc.hintAt = params.hintAt;
    doc.hintSent = false;
    doc.endsAt = params.endsAt;
    doc.revealedAt = {};
    doc.attempts = {};
    doc.solvers = [];
    doc.announceMessageId = params.announceMessageId ?? undefined;
    doc.nextSpawnAt = undefined;
    doc.markModified('riddle');
    doc.markModified('revealedAt');
    doc.markModified('attempts');
    doc.markModified('solvers');
    await doc.save();
  }

  static async incrementAttempt(userId: string): Promise<void> {
    await EnigmeStateModel.updateOne({}, { $inc: { [`attempts.${userId}`]: 1 } });
  }

  static async addSolver(userId: string, at: Date, durationMs: number): Promise<void> {
    await EnigmeStateModel.updateOne({}, { $push: { solvers: { userId, at, durationMs } } });
  }

  /** Pose le départ du chrono au premier appel, puis renvoie toujours la même date. */
  static async revealFor(userId: string): Promise<Date> {
    const key = `revealedAt.${userId}`;
    const doc = await EnigmeStateModel.findOneAndUpdate(
      { [key]: { $exists: false } },
      { $set: { [key]: new Date() } },
      { new: true },
    );
    if (doc?.revealedAt?.[userId]) return doc.revealedAt[userId];
    const current = await this.get();
    return current?.revealedAt?.[userId] ?? current?.startedAt ?? new Date();
  }

  static async setHintSent(): Promise<void> {
    await EnigmeStateModel.updateOne({}, { $set: { hintSent: true } });
  }

  static async clearActive(): Promise<void> {
    await EnigmeStateModel.updateOne(
      {},
      {
        $unset: {
          activeThreadId: '',
          activeMessageId: '',
          riddle: '',
          startedAt: '',
          hintAt: '',
          hintSent: '',
          endsAt: '',
          revealedAt: '',
          attempts: '',
          solvers: '',
          announceMessageId: '',
        },
      },
    );
  }
}

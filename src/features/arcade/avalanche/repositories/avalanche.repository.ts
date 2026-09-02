import AvalancheStateModel, { IAvalancheStateDoc } from '../models/avalanche-state.model';

export class AvalancheRepository {
  static async get(): Promise<IAvalancheStateDoc | null> {
    return AvalancheStateModel.findOne();
  }

  static async getOrCreate(): Promise<IAvalancheStateDoc> {
    const existing = await this.get();
    if (existing) return existing;
    return AvalancheStateModel.create({});
  }

  static async setLastPlanDate(date: string): Promise<void> {
    await AvalancheStateModel.updateOne({}, { $set: { lastPlanDate: date } }, { upsert: true });
  }

  static async setActive(params: {
    threadId: string;
    messageId: string;
    registrationEndsAt: Date;
    announceMessageId?: string | null;
  }): Promise<void> {
    const doc = await this.getOrCreate();
    doc.activeThreadId = params.threadId;
    doc.activeMessageId = params.messageId;
    doc.registrationEndsAt = params.registrationEndsAt;
    doc.announceMessageId = params.announceMessageId ?? undefined;
    doc.players = {};
    doc.eliminationTimes = [];
    doc.eliminatedNumbers = [];
    doc.markModified('players');
    await doc.save();
  }

  static async setPlayer(userId: string, num: number): Promise<void> {
    await AvalancheStateModel.updateOne({}, { $set: { [`players.${userId}`]: num } });
  }

  static async setEliminationTimes(times: Date[]): Promise<void> {
    await AvalancheStateModel.updateOne({}, { $set: { eliminationTimes: times } });
  }

  static async addEliminated(num: number): Promise<void> {
    await AvalancheStateModel.updateOne({}, { $push: { eliminatedNumbers: num } });
  }

  static async clearActive(): Promise<void> {
    await AvalancheStateModel.updateOne(
      {},
      {
        $unset: {
          activeThreadId: '',
          activeMessageId: '',
          players: '',
          registrationEndsAt: '',
          eliminationTimes: '',
          eliminatedNumbers: '',
          announceMessageId: '',
        },
      },
    );
  }
}

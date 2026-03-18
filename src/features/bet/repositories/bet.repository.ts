import BetModel, { IBet } from '../models/bet.model';

export class BetRepository {
  static async create(data: {
    title: string;
    options: { name: string }[];
    channelId: string;
    messageId: string;
    createdBy: string;
  }): Promise<IBet> {
    return BetModel.create({
      ...data,
      options: data.options.map(o => ({ name: o.name, totalAmount: 0, entryCount: 0 })),
    });
  }

  static async findById(id: string): Promise<IBet | null> {
    return BetModel.findById(id);
  }

  static async updateMessageId(betId: string, messageId: string): Promise<void> {
    await BetModel.updateOne({ _id: betId }, { $set: { messageId } });
  }

  static async addEntry(betId: string, userId: string, optionIndex: number, amount: number): Promise<IBet | null> {
    return BetModel.findByIdAndUpdate(
      betId,
      {
        $push: { entries: { userId, optionIndex, amount } },
        $inc: {
          [`options.${optionIndex}.totalAmount`]: amount,
          [`options.${optionIndex}.entryCount`]: 1,
        },
      },
      { new: true },
    );
  }

  static async setStatus(betId: string, status: string, winnerIndex?: number): Promise<IBet | null> {
    const update: any = { $set: { status } };
    if (winnerIndex !== undefined) update.$set.winnerIndex = winnerIndex;
    return BetModel.findByIdAndUpdate(betId, update, { new: true });
  }
}

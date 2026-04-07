import GroupModel, { IGroup } from '../models/group.model';

export class GroupRepository {
  async create(data: {
    creatorId: string;
    gameId: string;
    type: string;
    mode?: string;
    rankMin?: string;
    totalSlots: number;
    description?: string;
    sessionTime?: string;
  }): Promise<IGroup> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    return GroupModel.create({
      ...data,
      joinedUserIds: [data.creatorId],
      status: 'open',
      createdAt: now,
      expiresAt,
    });
  }

  async findById(id: string): Promise<IGroup | null> {
    return GroupModel.findById(id);
  }

  async setMessageInfo(id: string, messageId: string, channelId: string): Promise<void> {
    await GroupModel.findByIdAndUpdate(id, { messageId, channelId });
  }

  async addUser(id: string, userId: string): Promise<IGroup | null> {
    return GroupModel.findByIdAndUpdate(
      id,
      { $addToSet: { joinedUserIds: userId } },
      { new: true }
    );
  }

  async removeUser(id: string, userId: string): Promise<IGroup | null> {
    return GroupModel.findByIdAndUpdate(
      id,
      { $pull: { joinedUserIds: userId } },
      { new: true }
    );
  }

  async setStatus(id: string, status: 'open' | 'full' | 'closed'): Promise<IGroup | null> {
    return GroupModel.findByIdAndUpdate(id, { status }, { new: true });
  }

  async findActiveByCreator(creatorId: string): Promise<IGroup | null> {
    return GroupModel.findOne({ creatorId, status: { $in: ['open', 'full'] } });
  }

  async findExpired(): Promise<IGroup[]> {
    return GroupModel.find({ status: { $in: ['open', 'full'] }, expiresAt: { $lt: new Date() } });
  }
}

export default new GroupRepository();

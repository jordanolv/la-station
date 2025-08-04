import ChatGamingItemModel, { IChatGamingItem } from '../models/chatGamingItem.model';
import { NotFoundError } from './chatGaming.types';

export class ChatGamingRepository {
  
  async create(gameData: Partial<IChatGamingItem>): Promise<IChatGamingItem> {
    return ChatGamingItemModel.create(gameData);
  }

  async findById(id: string): Promise<IChatGamingItem | null> {
    return ChatGamingItemModel.findById(id);
  }

  async findByGuild(guildId: string): Promise<IChatGamingItem[]> {
    return ChatGamingItemModel.find({ guildId }).sort({ createdAt: -1 });
  }

  async findByThreadId(threadId: string): Promise<IChatGamingItem | null> {
    return ChatGamingItemModel.findOne({ threadId });
  }

  async findByMessageId(messageId: string): Promise<IChatGamingItem | null> {
    return ChatGamingItemModel.findOne({ messageId });
  }

  async update(id: string, updates: Partial<IChatGamingItem>): Promise<IChatGamingItem> {
    const updated = await ChatGamingItemModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundError();
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await ChatGamingItemModel.findByIdAndDelete(id);
    return !!result;
  }

  async updateDiscordInfo(id: string, threadId: string, messageId: string, roleId: string): Promise<IChatGamingItem> {
    return this.update(id, { threadId, messageId, roleId });
  }
}
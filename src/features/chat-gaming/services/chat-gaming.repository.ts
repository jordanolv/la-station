import ChatGamingItemModel, { IChatGamingItem } from '../models/chat-gaming-item.model';
import { NotFoundError } from './chat-gaming.types';

export class ChatGamingRepository {
  async create(gameData: Partial<IChatGamingItem>): Promise<IChatGamingItem> {
    return ChatGamingItemModel.create(gameData);
  }

  async findById(id: string): Promise<IChatGamingItem | null> {
    return ChatGamingItemModel.findById(id);
  }

  async findAll(): Promise<IChatGamingItem[]> {
    return ChatGamingItemModel.find({}).sort({ createdAt: -1 });
  }

  async findByThreadId(threadId: string): Promise<IChatGamingItem | null> {
    return ChatGamingItemModel.findOne({ threadId });
  }

  async findByMessageId(messageId: string): Promise<IChatGamingItem | null> {
    return ChatGamingItemModel.findOne({ messageId });
  }

  async update(id: string, updates: Partial<IChatGamingItem>): Promise<IChatGamingItem> {
    const updated = await ChatGamingItemModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!updated) throw new NotFoundError();
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

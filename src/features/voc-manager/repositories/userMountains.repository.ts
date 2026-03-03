import UserMountainsModel from '../models/userMountains.model';

export interface UnlockedMountainEntry {
  mountainId: string;
  unlockedAt: Date;
}

export class UserMountainsRepository {
  static async getByUserId(userId: string) {
    return UserMountainsModel.findOne({ userId });
  }

  static async isUnlocked(userId: string, mountainId: string): Promise<boolean> {
    const doc = await this.getByUserId(userId);
    return doc?.unlockedMountains.some(m => m.mountainId === mountainId) ?? false;
  }

  static async unlock(userId: string, mountainId: string): Promise<{ totalUnlocked: number } | null> {
    let doc = await this.getByUserId(userId);

    if (!doc) {
      doc = new UserMountainsModel({ userId, unlockedMountains: [] });
    }

    if (doc.unlockedMountains.some(m => m.mountainId === mountainId)) {
      return null; // Already unlocked
    }

    doc.unlockedMountains.push({ mountainId, unlockedAt: new Date() });
    await doc.save();

    return { totalUnlocked: doc.unlockedMountains.length };
  }

  static async getUnlocked(userId: string): Promise<UnlockedMountainEntry[]> {
    const doc = await this.getByUserId(userId);
    return doc?.unlockedMountains ?? [];
  }
}

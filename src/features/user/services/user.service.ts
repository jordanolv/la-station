import { User as DiscordUser, Guild } from 'discord.js';
import UserModel, { IUser } from '../models/user.model';
import { ArcadeGameName } from '../../arcade/types/arcade.types';

export class UserService {

  static async getUserByDiscordId(discordId: string) {
    return UserModel.findOne({ discordId });
  }

  static async getUsers() {
    return UserModel.find({});
  }

  static async createUser(userData: DiscordUser, _guildData?: Guild) {
    return UserModel.create({
      discordId: userData.id,
      name: userData.username,
      profil: { money: 500, exp: 0, lvl: 1 },
      stats: { totalMsg: 0, voiceTime: 0, voiceHistory: [] },
      infos: { registeredAt: new Date(), updatedAt: new Date() }
    });
  }

  static async updateUser(discordId: string, updates: any) {
    return UserModel.findOneAndUpdate(
      { discordId },
      { $set: updates },
      { new: true }
    );
  }

  static async incrementTotalMsg(discordId: string) {
    return UserModel.findOneAndUpdate(
      { discordId },
      { $inc: { 'stats.totalMsg': 1 } },
      { new: true, upsert: true }
    );
  }

  static async incrementVoiceTime(discordId: string, seconds: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return UserModel.findOneAndUpdate(
      { discordId },
      {
        $inc: { 'stats.voiceTime': seconds },
        $push: {
          'stats.voiceHistory': {
            date: today,
            time: seconds
          }
        }
      },
      { new: true }
    );
  }

  static async getVoiceStatsLast14Days(discordId: string): Promise<{ date: Date; time: number }[]> {
    const user = await UserModel.findOne({ discordId });
    if (!user) return [];

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const dailyStats = new Map<string, number>();
    user.stats.voiceHistory.forEach(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      if (entryDate >= fourteenDaysAgo) {
        const dateKey = entryDate.toISOString().split('T')[0];
        dailyStats.set(dateKey, (dailyStats.get(dateKey) || 0) + entry.time);
      }
    });

    return Array.from(dailyStats.entries())
      .map(([date, time]) => ({ date: new Date(date), time }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  static async getVoiceStatsLast7Days(discordId: string) {
    const user = await UserModel.findOne({ discordId });
    if (!user) return [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyStats = new Map<string, number>();

    user.stats.voiceHistory.forEach(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);

      if (entryDate >= sevenDaysAgo) {
        const dateKey = entryDate.toISOString().split('T')[0];
        dailyStats.set(dateKey, (dailyStats.get(dateKey) || 0) + entry.time);
      }
    });

    return Array.from(dailyStats.entries())
      .map(([date, time]) => ({
        date: new Date(date),
        time
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  static async updateUserMoney(discordId: string, amount: number) {
    return UserModel.findOneAndUpdate(
      { discordId },
      { $inc: { 'profil.money': amount } },
      { new: true }
    );
  }

  static async getUserMoney(discordId: string): Promise<number> {
    const user = await UserModel.findOne({ discordId });
    return user?.profil?.money || 0;
  }

  static async recordArcadeWin(discordId: string, gameName: ArcadeGameName) {
    return UserModel.findOneAndUpdate(
      { discordId },
      { $inc: { [`stats.arcade.${gameName}.wins`]: 1 } },
      { new: true, upsert: true }
    );
  }

  static async recordArcadeLoss(discordId: string, gameName: ArcadeGameName) {
    return UserModel.findOneAndUpdate(
      { discordId },
      { $inc: { [`stats.arcade.${gameName}.losses`]: 1 } },
      { new: true, upsert: true }
    );
  }

  static async getArcadeStats(discordId: string, gameName?: ArcadeGameName) {
    const user = await UserModel.findOne({ discordId });
    if (!user?.stats?.arcade) return gameName ? { wins: 0, losses: 0 } : { shifumi: { wins: 0, losses: 0 }, puissance4: { wins: 0, losses: 0 }, morpion: { wins: 0, losses: 0 }, battle: { wins: 0, losses: 0 } };

    if (gameName) {
      return user.stats.arcade[gameName] || { wins: 0, losses: 0 };
    }

    return user.stats.arcade;
  }

  static async updateDailyStreak(discordId: string): Promise<IUser | null> {
    const user = await UserModel.findOne({ discordId });
    if (!user) return null;

    const now = new Date();
    const toParisDay = (d: Date) => d.toLocaleDateString('sv', { timeZone: 'Europe/Paris' });
    const today = toParisDay(now);

    if (!user.stats.lastActivityDate) {
      return UserModel.findOneAndUpdate(
        { discordId },
        {
          $set: {
            'stats.lastActivityDate': now,
            'stats.dailyStreak': 1
          }
        },
        { new: true }
      );
    }

    const lastActivity = new Date(user.stats.lastActivityDate);
    const lastActivityDay = toParisDay(lastActivity);

    const diffDays = Math.floor((Date.parse(today) - Date.parse(lastActivityDay)) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return user;
    } else if (diffDays === 1) {
      return UserModel.findOneAndUpdate(
        { discordId },
        {
          $set: { 'stats.lastActivityDate': now },
          $inc: { 'stats.dailyStreak': 1 }
        },
        { new: true }
      );
    } else {
      return UserModel.findOneAndUpdate(
        { discordId },
        {
          $set: {
            'stats.lastActivityDate': now,
            'stats.dailyStreak': 1
          }
        },
        { new: true }
      );
    }
  }

}

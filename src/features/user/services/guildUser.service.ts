import { User, Guild } from 'discord.js';
import GlobalUserModel from '../models/global-user.model';
import GuildUserModel, { IGuildUser } from '../models/guild-user.model';
import { ArcadeGameName } from '../../arcade/types/arcade.types';

export class UserService {

  static async getGlobalUserByDiscordId(discordId: string) {
    return GlobalUserModel.findOne({ id: discordId });
  }

  static async getAllGlobalUsers() {
    return GlobalUserModel.find({});
  }

  static async getGuildUserByDiscordId(discordId: string, guildId: string) {
    return GuildUserModel.findOne({ discordId, guildId });
  }

  static async getGuildUsersByGuildId(guildId: string) {
    return GuildUserModel.find({ guildId });
  }

  static async createGlobalUser(userData: User) {
    return GlobalUserModel.create({
      id: userData.id,
      name: userData.username,
      registeredAt: Date.now()
    });
  }

  static async createGuildUser(userData: User, guildData: Guild) {
    const guildUser = await GuildUserModel.create({
      discordId: userData.id,
      name: userData.username,
      guildId: guildData.id,
      profil: { money: 500, exp: 0, lvl: 1 },
      stats: { totalMsg: 0, voiceTime: 0, voiceHistory: [] },
      infos: { registeredAt: new Date(), updatedAt: new Date() }
    });

    const globalUser = await this.getGlobalUserByDiscordId(userData.id);
    if (!globalUser) {
      await this.createGlobalUser(userData);
    }

    return guildUser;
  }

  static async updateGuildUser(discordId: string, guildId: string, updates: any) {
    return GuildUserModel.findOneAndUpdate(
      { discordId, guildId },
      { $set: updates },
      { new: true }
    );
  }

  static async incrementTotalMsg(discordId: string, guildId: string) {
    return GuildUserModel.findOneAndUpdate(
      { discordId, guildId },
      { $inc: { 'stats.totalMsg': 1 } },
      { new: true, upsert: true }
    );
  }

  static async incrementVoiceTime(discordId: string, guildId: string, seconds: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return GuildUserModel.findOneAndUpdate(
      { discordId, guildId },
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

  static async getVoiceStatsLast7Days(discordId: string, guildId: string) {
    const user = await GuildUserModel.findOne({ discordId, guildId });
    if (!user) return [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Regrouper les entrées par jour
    const dailyStats = new Map<string, number>();

    user.stats.voiceHistory.forEach(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);

      if (entryDate >= sevenDaysAgo) {
        const dateKey = entryDate.toISOString().split('T')[0];
        dailyStats.set(dateKey, (dailyStats.get(dateKey) || 0) + entry.time);
      }
    });

    // Convertir en tableau et trier par date
    return Array.from(dailyStats.entries())
      .map(([date, time]) => ({
        date: new Date(date),
        time
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  static async updateGuildUserMoney(discordId: string, guildId: string, amount: number) {
    return GuildUserModel.findOneAndUpdate(
      { discordId, guildId },
      { $inc: { 'profil.money': amount } },
      { new: true }
    );
  }

  static async getGuildUserMoney(discordId: string, guildId: string): Promise<number> {
    const user = await GuildUserModel.findOne({ discordId, guildId });
    return user?.profil?.money || 0;
  }

  static async recordArcadeWin(discordId: string, guildId: string, gameName: ArcadeGameName) {
    return GuildUserModel.findOneAndUpdate(
      { discordId, guildId },
      { $inc: { [`stats.arcade.${gameName}.wins`]: 1 } },
      { new: true, upsert: true }
    );
  }

  static async recordArcadeLoss(discordId: string, guildId: string, gameName: ArcadeGameName) {
    return GuildUserModel.findOneAndUpdate(
      { discordId, guildId },
      { $inc: { [`stats.arcade.${gameName}.losses`]: 1 } },
      { new: true, upsert: true }
    );
  }

  static async getArcadeStats(discordId: string, guildId: string, gameName?: ArcadeGameName) {
    const user = await GuildUserModel.findOne({ discordId, guildId });
    if (!user?.stats?.arcade) return gameName ? { wins: 0, losses: 0 } : { shifumi: { wins: 0, losses: 0 }, puissance4: { wins: 0, losses: 0 }, morpion: { wins: 0, losses: 0 }, battle: { wins: 0, losses: 0 } };

    if (gameName) {
      return user.stats.arcade[gameName] || { wins: 0, losses: 0 };
    }

    return user.stats.arcade;
  }

  /**
   * Met à jour la daily streak d'un utilisateur
   * La streak s'incrémente si l'activité est le jour suivant
   * La streak se reset si plus d'un jour d'inactivité
   */
  static async updateDailyStreak(discordId: string, guildId: string): Promise<IGuildUser | null> {
    const user = await GuildUserModel.findOne({ discordId, guildId });
    if (!user) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Si lastActivityDate n'existe pas, c'est la première activité
    if (!user.stats.lastActivityDate) {
      return GuildUserModel.findOneAndUpdate(
        { discordId, guildId },
        {
          $set: {
            'stats.lastActivityDate': today,
            'stats.dailyStreak': 1
          }
        },
        { new: true }
      );
    }

    const lastActivity = new Date(user.stats.lastActivityDate);
    const lastActivityDay = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());

    // Calculer la différence en jours
    const diffTime = today.getTime() - lastActivityDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Même jour, pas de changement
      return user;
    } else if (diffDays === 1) {
      // Jour suivant, incrémenter la streak
      return GuildUserModel.findOneAndUpdate(
        { discordId, guildId },
        {
          $set: { 'stats.lastActivityDate': today },
          $inc: { 'stats.dailyStreak': 1 }
        },
        { new: true }
      );
    } else {
      // Plus d'un jour d'écart, reset la streak
      return GuildUserModel.findOneAndUpdate(
        { discordId, guildId },
        {
          $set: {
            'stats.lastActivityDate': today,
            'stats.dailyStreak': 1
          }
        },
        { new: true }
      );
    }
  }

} 
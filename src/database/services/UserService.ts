import { User, Guild, Message } from 'discord.js';
import GlobalUserModel from '../models/GlobalUser.js';
import GuildUserModel from '../models/GuildUser.js';
import { GuildService } from './GuildService.js';
import { BotClient } from '../../bot/BotClient.js';
import { getDateDaysAgo } from '../../bot/utils/DateFormat.js';
import { IGuildUser } from '../models/GuildUser.js';
export class UserService {
  static xpCooldown: Record<string, number> = {};

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
      profil: {},
      stats: {},
      infos: {}
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
      { new: true }
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

    const sevenDaysAgo = getDateDaysAgo(7);

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

  static async getXpToLevelUp(lvl: number): Promise<number> {
    return 5 * (lvl * lvl) + 110 * lvl + 100;
  }

  static async checkLevelUp(client: BotClient, user: IGuildUser, message: Message) {
    if(!user) return;

    const neededXpToLevelUp = 5 * (user.profil.lvl * user.profil.lvl) + 110 * user.profil.lvl + 100;
    
    if (user.profil.exp > neededXpToLevelUp) {
      user.profil.lvl++;
      client.emit('levelUp', user, message);
    }
    return user;
  }
  
  static async giveXpToUser(client: BotClient, message: Message, amount: number) {
    const discordId = message.author.id;
    const guildId = message.guild?.id;

    if (!guildId) return null;

    const guild = await GuildService.getGuildById(guildId);
    if (!guild) return null;

    const isInCooldown = this.xpCooldown[discordId];
    if (isInCooldown) {
      if (isInCooldown > Date.now()) {
        return;
      }
    }
    const toWait = Date.now() + 2500;
    this.xpCooldown[discordId] = toWait;
  
    const xpMinToGive = 10;
    const xpMaxToGive = 20;
    const xpToGive =
      Math.floor(Math.random() * (xpMaxToGive - xpMinToGive + 1)) +
      xpMinToGive * guild.features.leveling.taux;

    const user = await GuildUserModel.findOne({ discordId, guildId });
    if (!user) return null;

    user.profil.exp += xpToGive;
    (user as IGuildUser & { guild: any }).guild = guild;

    await this.checkLevelUp(client, user, message);
    await user.save();

    return user;
  }
} 
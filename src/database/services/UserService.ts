import { User, Guild } from 'discord.js';
import UserModel, { IUser } from '../models/User';
import { GuildService } from './GuildService';
import { BotClient } from '@/bot/BotClient';

export class UserService {
  static xpCooldown: Record<string, number> = {};
  static async getUserByDiscordId(discordId: string): Promise<IUser | null> {
    return UserModel.findOne({ discordId });
  }

  static async createUser(userData: User, guildData: Guild): Promise<IUser> {
    return UserModel.create(
      {
        discordId: userData.id,
        name: userData.username,
        guild: {
          guildId: guildData.id,
          guildName: guildData.name
        },
        profil: {},
        stats: {},
        infos: {}
      }
    );
  }

  static async updateUser(discordId: string, updates: Partial<IUser>): Promise<IUser | null> {
    return UserModel.findOneAndUpdate(
      { discordId: discordId },
      { $set: updates },
      { new: true }
    );
  }

  static async incrementTotalMsg(discordId: string): Promise<IUser | null> {
    return UserModel.findOneAndUpdate(
      { discordId: discordId },
      { $inc: { 'stats.totalMsg': 1 } },
      { new: true }
    );
  }

  static async checkLevelUp(client: BotClient, user: IUser): Promise<IUser | null> {
    
    if(!user) return;

    const neededXpToLevelUp = 5 * (user.profil.lvl * user.profil.lvl) + 110 * user.profil.lvl + 100;
    
    if (user.profil.exp > neededXpToLevelUp) {
      user.profil.lvl++;
      client.emit("levelUp", user);
    }
    return user;
  }
  
  static async giveXpToUser(client: BotClient, discordId: string, amount: number): Promise<IUser | null> {
    await UserModel.findOneAndUpdate(
      { discordId: discordId },
      { $inc: { 'profil.exp': amount } },
      { new: true }
    );

        const user = await UserModel.findOne({ discordId });
        const guild = await GuildService.getGuildById(user?.guild.guildId);

        const isInCooldown = this.xpCooldown[discordId];
        if (isInCooldown) {
          if (isInCooldown > Date.now()) {
            return;
          }
        }
        const toWait = Date.now() + 2500;
        this.xpCooldown[discordId] = toWait;
      
        const xpMaxToGive = 8;
        const xpMinToGive = 4;
        const xpToGive =
          Math.floor(Math.random() * (xpMaxToGive - xpMinToGive + 1)) +
          xpMinToGive * guild.features.leveling.taux;

        user.profil.exp += xpToGive;

        await this.checkLevelUp(client,user);
        await user.save();

        return user;

  }
} 
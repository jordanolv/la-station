import { LevelingConfig, ILeveling } from '../models/levelingConfig.model';
import { Message } from 'discord.js';
import { BotClient } from '../../../bot/client';
import GuildUserModel, { IGuildUser } from '../../user/models/guild-user.model';
import GuildModel from '../../discord/models/guild.model';
import { GuildService } from '../../discord/services/guild.service';

export class LevelingService {
  static xpCooldown: Record<string, number> = {};

  /**
   * Récupère la configuration de leveling pour une guilde
   */
  static async getLeveling(guildId: string): Promise<ILeveling | null> {
    const guild = await GuildModel.findOne({ guildId });
    return guild?.features?.leveling || null;
  }

  /**
   * Crée une configuration de leveling pour une guilde
   */
  static async createLeveling(
    guildId: string, 
    enabled: boolean = true,
    taux: number = 1
  ): Promise<ILeveling> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    const levelingConfig: ILeveling = {
      enabled,
      taux,
      notifLevelUp: true,
      channelNotif: null
    };
    
    guild.features = guild.features || {};
    guild.features.leveling = levelingConfig;
    await guild.save();
    
    return levelingConfig;
  }

  /**
   * Récupère ou crée une configuration de leveling pour une guilde
   */
  static async getOrCreateLeveling(
    guildId: string, 
    enabled: boolean = true,
    taux: number = 1
  ): Promise<ILeveling> {
    const leveling = await this.getLeveling(guildId);
    if (leveling) {
      return leveling;
    }
    
    return this.createLeveling(guildId, enabled, taux);
  }

  /**
   * Active ou désactive la fonctionnalité
   */
  static async toggleFeature(guildId: string, enabled: boolean): Promise<ILeveling | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features) guild.features = {};
    if (!guild.features.leveling) {
      guild.features.leveling = {
        enabled: false,
        taux: 1,
        notifLevelUp: true,
        channelNotif: null
      };
    }
    
    guild.features.leveling.enabled = enabled;
    await guild.save();
    
    return guild.features.leveling;
  }

  /**
   * Change le taux d'XP
   */
  static async setTaux(guildId: string, taux: number): Promise<ILeveling | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features) guild.features = {};
    if (!guild.features.leveling) {
      guild.features.leveling = {
        enabled: false,
        taux: 1,
        notifLevelUp: true,
        channelNotif: null
      };
    }
    
    guild.features.leveling.taux = taux;
    await guild.save();
    
    return guild.features.leveling;
  }

  /**
   * Configure les notifications de level up
   */
  static async configureNotifications(
    guildId: string, 
    notifEnabled: boolean,
    channelId?: string
  ): Promise<ILeveling | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features) guild.features = {};
    if (!guild.features.leveling) {
      guild.features.leveling = {
        enabled: false,
        taux: 1,
        notifLevelUp: true,
        channelNotif: null
      };
    }
    
    guild.features.leveling.notifLevelUp = notifEnabled;
    if (channelId) {
      guild.features.leveling.channelNotif = channelId;
    }
    
    await guild.save();
    return guild.features.leveling;
  }

  /**
   * Calcule l'XP nécessaire pour atteindre un niveau
   */
  static getXpToLevelUp(lvl: number): number {
    return 5 * (lvl * lvl) + 110 * lvl + 100;
  }

  /**
   * Vérifie si un utilisateur monte de niveau
   */
  static async checkLevelUp(client: BotClient, user: IGuildUser, message: Message) {
    if(!user) return;

    const neededXpToLevelUp = this.getXpToLevelUp(user.profil.lvl);
    
    if (user.profil.exp >= neededXpToLevelUp) {
      user.profil.lvl++;
      await user.save();
      client.emit('levelUp', user, message);
    }
    return user;
  }
  
  /**
   * Donne de l'XP à un utilisateur
   */
  static async giveXpToUser(client: BotClient, message: Message, amount?: number) {
    if (!message.guild) return null;
    
    const discordId = message.author.id;
    const guildId = message.guild.id;

    // Vérification du cooldown
    const isInCooldown = this.xpCooldown[discordId];
    if (isInCooldown && isInCooldown > Date.now()) {
      return;
    }

    // Mise à jour du cooldown
    const toWait = Date.now() + 2500;
    this.xpCooldown[discordId] = toWait;
    
    // Récupération des données
    let user = await GuildUserModel.findOne({ discordId, guildId }) as IGuildUser;
    if (!user) return null;
    
    const levelingData = await this.getOrCreateLeveling(guildId);
    
    if (!levelingData.enabled) return null;
    
    // Calcul de l'XP à donner
    let xpToGive: number;
    if (amount !== undefined) {
      xpToGive = amount;
    } else {
      const xpMinToGive = 10;
      const xpMaxToGive = 20;
      xpToGive =
        Math.floor(Math.random() * (xpMaxToGive - xpMinToGive + 1)) +
        xpMinToGive * levelingData.taux;
    }

    // Mise à jour de l'XP
    user.profil.exp += xpToGive;
    await user.save();

    // Vérification du level up
    user = await this.checkLevelUp(client, user, message);

    return user;
  }
} 
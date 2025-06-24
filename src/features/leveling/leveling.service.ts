import LevelingModel, { ILeveling } from './leveling.model';
import { Message } from 'discord.js';
import { BotClient } from '../../bot/client';
import GuildUserModel, { IGuildUser } from '../../features/user/models/guild-user.model';

export class LevelingService {
  static xpCooldown: Record<string, number> = {};

  /**
   * Récupère la configuration de leveling pour une guilde
   */
  static async getLeveling(guildId: string): Promise<ILeveling | null> {
    return LevelingModel.findOne({ guildId });
  }

  /**
   * Crée une configuration de leveling pour une guilde
   */
  static async createLeveling(
    guildId: string, 
    enabled: boolean = true,
    taux: number = 1
  ): Promise<ILeveling> {
    return LevelingModel.create({
      guildId,
      enabled,
      taux,
      notifLevelUp: true,
      channelNotif: null
    });
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
    const levelingData = await this.getLeveling(guildId);
    if (!levelingData) return null;

    levelingData.enabled = enabled;
    return levelingData.save();
  }

  /**
   * Change le taux d'XP
   */
  static async setTaux(guildId: string, taux: number): Promise<ILeveling | null> {
    const levelingData = await this.getLeveling(guildId);
    if (!levelingData) return null;

    levelingData.taux = taux;
    return levelingData.save();
  }

  /**
   * Configure les notifications de level up
   */
  static async configureNotifications(
    guildId: string, 
    notifEnabled: boolean,
    channelId?: string
  ): Promise<ILeveling | null> {
    const levelingData = await this.getLeveling(guildId);
    if (!levelingData) return null;

    levelingData.notifLevelUp = notifEnabled;
    if (channelId) {
      levelingData.channelNotif = channelId;
    }
    
    return levelingData.save();
  }

  /**
   * Calcule l'XP nécessaire pour atteindre un niveau
   */
  static async getXpToLevelUp(lvl: number): Promise<number> {
    return 5 * (lvl * lvl) + 110 * lvl + 100;
  }

  /**
   * Vérifie si un utilisateur monte de niveau
   */
  static async checkLevelUp(client: BotClient, user: IGuildUser, message: Message) {
    if(!user) return;

    const neededXpToLevelUp = await this.getXpToLevelUp(user.profil.lvl);
    
    if (user.profil.exp > neededXpToLevelUp) {
      user.profil.lvl++;
      client.emit('levelUp', user, message);
    }
    return user;
  }
  
  /**
   * Donne de l'XP à un utilisateur
   */
  static async giveXpToUser(client: BotClient, message: Message) {
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
    const user = await GuildUserModel.findOne({ discordId, guildId });
    if (!user) return null;
    
    const levelingData = await this.getOrCreateLeveling(guildId);
    
    // Calcul de l'XP à donner
    const xpMinToGive = 10;
    const xpMaxToGive = 20;
    const xpToGive =
      Math.floor(Math.random() * (xpMaxToGive - xpMinToGive + 1)) +
      xpMinToGive * levelingData.taux;

    // Mise à jour de l'XP
    user.profil.exp += xpToGive;
    await user.save();

    // Vérification du level up
    await this.checkLevelUp(client, user, message);

    return user;
  }
} 
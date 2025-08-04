import { BotClient } from '../../../bot/client';
import { LevelingConfig } from '../models/levelingConfig.model';
import { GuildService } from '../../discord/services/guild.service';
import GuildUserModel, { IGuildUser } from '../../user/models/guild-user.model';
import { Message, EmbedBuilder, TextChannel } from 'discord.js';
import { emojis } from '../../../utils/emojis';
import {
  UpdateLevelingConfigDTO,
  LevelUpResult,
  XpCalculation,
  LevelingError,
  ValidationError,
  ValidationResult
} from './leveling.types';

export class LevelingService {
  private static xpCooldown: Record<string, number> = {};

  /**
   * Récupère la configuration de leveling pour une guilde
   */
  static async getLevelingConfig(guildId: string): Promise<LevelingConfig | null> {
    try {
      const guild = await GuildService.getOrCreateGuild(guildId);
      return guild?.features?.leveling || null;
    } catch (error) {
      throw new LevelingError(`Erreur lors de la récupération de la config leveling: ${error}`, 'CONFIG_FETCH_ERROR');
    }
  }

  /**
   * Récupère ou crée la configuration de leveling
   */
  static async getOrCreateLevelingConfig(guildId: string, enabled: boolean = false): Promise<LevelingConfig> {
    try {
      const guild = await GuildService.getOrCreateGuild(guildId);
      
      // Initialisation de la config si elle n'existe pas
      if (!guild.features) guild.features = {};
      if (!guild.features.leveling) {
        guild.features.leveling = {
          enabled: false,
          taux: 1,
          notifLevelUp: true,
          channelNotif: null
        };
      }
      
      // Si la config est nouvellement créée et enabled est spécifié
      if (!guild.features.leveling.enabled && enabled) {
        guild.features.leveling.enabled = enabled;
        await guild.save();
      }

      return guild.features.leveling;
    } catch (error) {
      throw new LevelingError(`Erreur lors de la récupération/création de la config leveling: ${error}`, 'CONFIG_CREATE_ERROR');
    }
  }

  /**
   * Met à jour la configuration de leveling
   */
  static async updateLevelingConfig(guildId: string, updates: UpdateLevelingConfigDTO): Promise<LevelingConfig> {
    try {
      const validation = this.validateConfigUpdates(updates);
      if (!validation.isValid) {
        throw new ValidationError('Données de configuration invalides', validation.errors);
      }

      const config = await this.getOrCreateLevelingConfig(guildId);
      const guild = await GuildService.getOrCreateGuild(guildId);

      // Mise à jour des propriétés
      Object.assign(guild.features.leveling, updates);
      
      await guild.save();
      return guild.features.leveling;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new LevelingError(`Erreur lors de la mise à jour de la config: ${error}`, 'CONFIG_UPDATE_ERROR');
    }
  }

  /**
   * Active ou désactive la fonctionnalité
   */
  static async toggleFeature(guildId: string, enabled: boolean): Promise<LevelingConfig> {
    return this.updateLevelingConfig(guildId, { enabled });
  }

  /**
   * Configure le taux d'XP
   */
  static async setTaux(guildId: string, taux: number): Promise<LevelingConfig> {
    return this.updateLevelingConfig(guildId, { taux });
  }

  /**
   * Configure les notifications de level up
   */
  static async configureNotifications(
    guildId: string, 
    notifEnabled: boolean,
    channelId?: string | null
  ): Promise<LevelingConfig> {
    return this.updateLevelingConfig(guildId, { 
      notifLevelUp: notifEnabled,
      channelNotif: channelId 
    });
  }

  /**
   * Calcule l'XP nécessaire pour atteindre un niveau
   */
  static getXpToLevelUp(level: number): number {
    return 5 * (level * level) + 110 * level + 100;
  }

  /**
   * Calcule l'XP à donner selon la configuration
   */
  static calculateXpToGive(config: LevelingConfig, baseAmount?: number): XpCalculation {
    const baseXp = baseAmount || (Math.floor(Math.random() * 11) + 10); // 10-20 XP base
    const multiplier = config.taux;
    const finalXp = Math.floor(baseXp * multiplier);

    return { baseXp, multiplier, finalXp };
  }

  /**
   * Donne de l'XP à un utilisateur et gère le level up
   */
  static async giveXpToUser(
    client: BotClient, 
    message: Message, 
    amount?: number
  ): Promise<LevelUpResult | null> {
    try {
      if (!message.guild) return null;
      
      const discordId = message.author.id;
      const guildId = message.guild.id;

      // Vérification du cooldown
      if (this.isUserInCooldown(discordId)) return null;
      
      // Récupération optimisée : user d'abord, puis config seulement si user existe
      const user = await GuildUserModel.findOne({ discordId, guildId }) as IGuildUser;
      if (!user) return null;
      
      const config = await this.getOrCreateLevelingConfig(guildId);
      if (!config?.enabled) return null;
      
      // Cooldown seulement si tout est valide
      this.setCooldown(discordId);
      
      // Calcul de l'XP à donner
      const xpCalculation = this.calculateXpToGive(config, amount);
      
      // Mise à jour de l'XP
      user.profil.exp += xpCalculation.finalXp;
      
      // Calcul optimisé du level up avec cache du xpNeeded
      const currentLevelXpNeeded = this.getXpToLevelUp(user.profil.lvl);
      const hasLeveledUp = await this.checkAndHandleLevelUp(client, user, message, config, currentLevelXpNeeded);
      
      await user.save();

      // Utiliser le niveau actuel pour le calcul final
      const finalLevelXpNeeded = hasLeveledUp ? this.getXpToLevelUp(user.profil.lvl) : currentLevelXpNeeded;

      return {
        hasLeveledUp,
        newLevel: user.profil.lvl,
        xpGiven: xpCalculation.finalXp,
        xpNeededForNext: finalLevelXpNeeded - user.profil.exp
      };
    } catch (error) {
      throw new LevelingError(`Erreur lors de l'attribution d'XP: ${error}`, 'XP_ATTRIBUTION_ERROR');
    }
  }

  /**
   * Vérifie et gère le level up
   */
  private static async checkAndHandleLevelUp(
    client: BotClient,
    user: IGuildUser, 
    message: Message,
    config: LevelingConfig,
    neededXpToLevelUp?: number
  ): Promise<boolean> {
    const xpNeeded = neededXpToLevelUp ?? this.getXpToLevelUp(user.profil.lvl);
    
    if (user.profil.exp >= xpNeeded) {
      user.profil.lvl++;
      
      // Gestion des notifications de level up
      await this.handleLevelUpNotification(client, user, message, config);
      
      return true;
    }
    
    return false;
  }

  /**
   * Gère les notifications de level up
   */
  private static async handleLevelUpNotification(
    client: BotClient,
    user: IGuildUser,
    message: Message,
    config: LevelingConfig
  ): Promise<void> {
    try {
      console.log(`${user.name} a atteint le niveau ${user.profil.lvl}`);

      if (!config.notifLevelUp) return;

      // Réaction sur le message
      if (message) {
        await message.react(emojis.levelUp).catch(console.error);
      }

      // Notification dans un channel spécifique si configuré
      if (config.channelNotif && message.guild) {
        const notifChannel = message.guild.channels.cache.get(config.channelNotif) as TextChannel;
        if (notifChannel) {
          const embed = new EmbedBuilder()
            .setTitle('🎉 Nouveau niveau !')
            .setDescription(`<@${user.discordId}> a atteint le niveau **${user.profil.lvl}** !`)
            .setColor(0x00ff00)
            .setTimestamp();

          await notifChannel.send({ embeds: [embed] }).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la notification de level up:', error);
    }
  }

  /**
   * Vérifie si un utilisateur est en cooldown
   */
  private static isUserInCooldown(discordId: string): boolean {
    const cooldownEnd = this.xpCooldown[discordId];
    return cooldownEnd && cooldownEnd > Date.now();
  }

  /**
   * Définit le cooldown pour un utilisateur
   */
  private static setCooldown(discordId: string): void {
    this.xpCooldown[discordId] = Date.now() + 2500; // 2.5 secondes
    
    // Nettoyage automatique du cache toutes les 100 entrées
    if (Object.keys(this.xpCooldown).length > 100) {
      this.cleanupCooldowns();
    }
  }

  /**
   * Nettoie les cooldowns expirés
   */
  private static cleanupCooldowns(): void {
    const now = Date.now();
    for (const [userId, cooldownEnd] of Object.entries(this.xpCooldown)) {
      if (cooldownEnd <= now) {
        delete this.xpCooldown[userId];
      }
    }
  }

  /**
   * Valide les mises à jour de configuration
   */
  private static validateConfigUpdates(updates: UpdateLevelingConfigDTO): ValidationResult {
    const errors: string[] = [];

    if (updates.taux !== undefined) {
      if (typeof updates.taux !== 'number' || updates.taux < 0.1 || updates.taux > 10) {
        errors.push('Le taux doit être un nombre entre 0.1 et 10');
      }
    }

    if (updates.channelNotif !== undefined && updates.channelNotif !== null) {
      if (typeof updates.channelNotif !== 'string' || !updates.channelNotif.match(/^\d{17,19}$/)) {
        errors.push('L\'ID du channel de notification doit être valide');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
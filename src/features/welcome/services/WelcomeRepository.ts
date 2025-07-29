import { getModelForClass } from '@typegoose/typegoose';
import { WelcomeConfig } from '../models/welcomeConfig.model';
import { Guild } from '../../discord/models/guild.model';

const GuildModel = getModelForClass(Guild);

/**
 * Repository pour l'accès aux données Welcome
 * Responsabilité unique: opérations CRUD sans logique métier
 */
export class WelcomeRepository {
  /**
   * Récupère la configuration Welcome d'une guilde
   */
  static async getConfigByGuildId(guildId: string): Promise<WelcomeConfig | null> {
    const guild = await GuildModel.findOne({ guildId }).exec();
    return guild?.features?.welcome || null;
  }

  /**
   * Met à jour la configuration Welcome d'une guilde
   */
  static async updateConfig(guildId: string, config: Partial<WelcomeConfig>): Promise<WelcomeConfig> {
    const guild = await GuildModel.findOne({ guildId }).exec();
    
    if (!guild) {
      throw new Error(`Guild with ID ${guildId} not found`);
    }

    // Initialiser les features si elles n'existent pas
    if (!guild.features) {
      guild.features = {};
    }

    // Fusionner la configuration existante avec les nouvelles données
    guild.features.welcome = {
      ...guild.features.welcome,
      ...config
    } as WelcomeConfig;

    await guild.save();
    return guild.features.welcome;
  }

  /**
   * Créer une configuration Welcome par défaut
   */
  static async createDefaultConfig(guildId: string): Promise<WelcomeConfig> {
    const defaultConfig: Partial<WelcomeConfig> = {
      enabled: false,
      welcomeEnabled: false,
      goodbyeEnabled: false,
      welcomeChannelId: null,
      goodbyeChannelId: null,
      welcomeMessage: 'Bienvenue {user} sur le serveur!',
      goodbyeMessage: 'Au revoir {user}!',
      generateWelcomeImage: false,
      generateGoodbyeImage: false,
      autoRoles: []
    };

    return this.updateConfig(guildId, defaultConfig);
  }

  /**
   * Vérifie si une guilde existe
   */
  static async guildExists(guildId: string): Promise<boolean> {
    const guild = await GuildModel.findOne({ guildId }).exec();
    return !!guild;
  }

  /**
   * Active/désactive la feature Welcome
   */
  static async toggleFeature(guildId: string, enabled: boolean): Promise<WelcomeConfig> {
    return this.updateConfig(guildId, { enabled });
  }

  /**
   * Active/désactive les messages de bienvenue
   */
  static async toggleWelcomeMessages(guildId: string, welcomeEnabled: boolean): Promise<WelcomeConfig> {
    return this.updateConfig(guildId, { welcomeEnabled });
  }

  /**
   * Active/désactive les messages d'au revoir
   */
  static async toggleGoodbyeMessages(guildId: string, goodbyeEnabled: boolean): Promise<WelcomeConfig> {
    return this.updateConfig(guildId, { goodbyeEnabled });
  }

  /**
   * Met à jour les canaux
   */
  static async updateChannels(
    guildId: string, 
    welcomeChannelId?: string | null, 
    goodbyeChannelId?: string | null
  ): Promise<WelcomeConfig> {
    const updates: Partial<WelcomeConfig> = {};
    
    if (welcomeChannelId !== undefined) {
      updates.welcomeChannelId = welcomeChannelId;
    }
    
    if (goodbyeChannelId !== undefined) {
      updates.goodbyeChannelId = goodbyeChannelId;
    }

    return this.updateConfig(guildId, updates);
  }

  /**
   * Met à jour les messages personnalisés
   */
  static async updateMessages(
    guildId: string, 
    welcomeMessage?: string, 
    goodbyeMessage?: string
  ): Promise<WelcomeConfig> {
    const updates: Partial<WelcomeConfig> = {};
    
    if (welcomeMessage !== undefined) {
      updates.welcomeMessage = welcomeMessage;
    }
    
    if (goodbyeMessage !== undefined) {
      updates.goodbyeMessage = goodbyeMessage;
    }

    return this.updateConfig(guildId, updates);
  }

  /**
   * Met à jour les paramètres de génération d'images
   */
  static async updateImageGeneration(
    guildId: string, 
    generateWelcomeImage?: boolean, 
    generateGoodbyeImage?: boolean
  ): Promise<WelcomeConfig> {
    const updates: Partial<WelcomeConfig> = {};
    
    if (generateWelcomeImage !== undefined) {
      updates.generateWelcomeImage = generateWelcomeImage;
    }
    
    if (generateGoodbyeImage !== undefined) {
      updates.generateGoodbyeImage = generateGoodbyeImage;
    }

    return this.updateConfig(guildId, updates);
  }

  /**
   * Met à jour les rôles automatiques
   */
  static async updateAutoRoles(guildId: string, autoRoles: string[]): Promise<WelcomeConfig> {
    return this.updateConfig(guildId, { autoRoles });
  }
}
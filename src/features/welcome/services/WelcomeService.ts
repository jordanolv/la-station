import { Client, GuildMember, User } from 'discord.js';
import { WelcomeConfig } from '../models/welcomeConfig.model';
import { WelcomeRepository } from './WelcomeRepository';
import { WelcomeFormatter } from './WelcomeFormatter';
import { WelcomeDiscordService } from './WelcomeDiscordService';
import { WelcomeImageService } from './WelcomeImageService';

/**
 * Service principal pour la feature Welcome
 * Responsabilité: orchestration des autres services
 */
export class WelcomeService {
  /**
   * Récupère la configuration Welcome d'une guilde
   */
  static async getConfig(guildId: string): Promise<WelcomeConfig> {
    try {
      const config = await WelcomeRepository.getConfigByGuildId(guildId);
      
      if (!config) {
        // Créer et retourner une configuration par défaut
        return await WelcomeRepository.createDefaultConfig(guildId);
      }
      
      return config;
    } catch (error) {
      console.error(`[WELCOME] Erreur lors de la récupération de la config pour ${guildId}:`, error);
      return WelcomeFormatter.createDefaultConfig();
    }
  }

  /**
   * Met à jour la configuration Welcome
   */
  static async updateConfig(guildId: string, config: Partial<WelcomeConfig>): Promise<WelcomeConfig> {
    // Valider la configuration
    const validation = WelcomeFormatter.validateWelcomeConfig(config);
    if (!validation.isValid) {
      throw new Error(`Configuration invalide: ${validation.errors.join(', ')}`);
    }

    return await WelcomeRepository.updateConfig(guildId, config);
  }

  /**
   * Active/désactive la feature Welcome
   */
  static async toggleFeature(guildId: string, enabled: boolean): Promise<WelcomeConfig> {
    return await WelcomeRepository.toggleFeature(guildId, enabled);
  }

  /**
   * Active/désactive les messages de bienvenue
   */
  static async toggleWelcome(guildId: string, welcomeEnabled: boolean): Promise<WelcomeConfig> {
    return await WelcomeRepository.toggleWelcomeMessages(guildId, welcomeEnabled);
  }

  /**
   * Active/désactive les messages d'au revoir
   */
  static async toggleGoodbye(guildId: string, goodbyeEnabled: boolean): Promise<WelcomeConfig> {
    return await WelcomeRepository.toggleGoodbyeMessages(guildId, goodbyeEnabled);
  }

  /**
   * Définit les canaux Welcome/Goodbye
   */
  static async setChannels(
    guildId: string,
    welcomeChannelId?: string | null,
    goodbyeChannelId?: string | null
  ): Promise<WelcomeConfig> {
    return await WelcomeRepository.updateChannels(guildId, welcomeChannelId, goodbyeChannelId);
  }

  /**
   * Définit le canal de bienvenue (backward compatibility)
   */
  static async setWelcomeChannel(guildId: string, channelId: string | null): Promise<WelcomeConfig> {
    return this.setChannels(guildId, channelId, undefined);
  }

  /**
   * Définit le canal d'au revoir (backward compatibility)
   */
  static async setGoodbyeChannel(guildId: string, channelId: string | null): Promise<WelcomeConfig> {
    return this.setChannels(guildId, undefined, channelId);
  }

  /**
   * Met à jour les messages personnalisés
   */
  static async updateMessages(
    guildId: string, 
    welcomeMessage?: string, 
    goodbyeMessage?: string
  ): Promise<WelcomeConfig> {
    return await WelcomeRepository.updateMessages(guildId, welcomeMessage, goodbyeMessage);
  }

  /**
   * Active/désactive la génération d'images
   */
  static async toggleImageGeneration(
    guildId: string, 
    welcome?: boolean, 
    goodbye?: boolean
  ): Promise<WelcomeConfig> {
    return await WelcomeRepository.updateImageGeneration(guildId, welcome, goodbye);
  }

  /**
   * Met à jour les rôles automatiques
   */
  static async updateAutoRoles(guildId: string, roleIds: string[]): Promise<WelcomeConfig> {
    return await WelcomeRepository.updateAutoRoles(guildId, roleIds);
  }

  /**
   * Traite l'arrivée d'un nouveau membre
   */
  static async handleMemberJoin(member: GuildMember): Promise<void> {
    try {
      const config = await this.getConfig(member.guild.id);
      
      // Vérifier si la feature est activée
      if (!config.enabled || !config.welcomeEnabled) {
        return;
      }

      // Attribuer les rôles automatiques
      if (config.autoRoles && config.autoRoles.length > 0) {
        await WelcomeDiscordService.assignAutoRoles(member, config.autoRoles);
      }

      // Générer l'image si nécessaire
      let imageBuffer: Buffer | undefined;
      if (config.generateWelcomeImage) {
        try {
          imageBuffer = await WelcomeImageService.generateWelcomeImage(
            member.user,
            member.guild.name
          );
        } catch (error) {
          console.error('[WELCOME] Erreur lors de la génération d\'image de bienvenue:', error);
        }
      }

      // Envoyer le message de bienvenue
      await WelcomeDiscordService.sendWelcomeMessage(
        member.guild,
        member,
        config,
        imageBuffer
      );

    } catch (error) {
      console.error(`[WELCOME] Erreur lors du traitement de l'arrivée de ${WelcomeFormatter.formatUserInfo(member)}:`, error);
    }
  }

  /**
   * Traite le départ d'un membre
   */
  static async handleMemberLeave(client: Client, guildId: string, user: User): Promise<void> {
    try {
      const config = await this.getConfig(guildId);
      
      // Vérifier si la feature est activée
      if (!config.enabled || !config.goodbyeEnabled) {
        return;
      }

      // Générer l'image si nécessaire
      let imageBuffer: Buffer | undefined;
      if (config.generateGoodbyeImage) {
        try {
          const guild = client.guilds.cache.get(guildId);
          if (guild) {
            imageBuffer = await WelcomeImageService.generateGoodbyeImage(user, guild.name);
          }
        } catch (error) {
          console.error('[WELCOME] Erreur lors de la génération d\'image d\'au revoir:', error);
        }
      }

      // Envoyer le message d'au revoir
      await WelcomeDiscordService.sendGoodbyeMessage(
        client,
        guildId,
        user,
        config,
        imageBuffer
      );

    } catch (error) {
      console.error(`[WELCOME] Erreur lors du traitement du départ de ${WelcomeFormatter.formatUserInfo(user)}:`, error);
    }
  }

  /**
   * Teste la configuration Welcome
   */
  static async testConfiguration(guildId: string): Promise<{ success: boolean; errors: string[] }> {
    try {
      const config = await this.getConfig(guildId);
      
      // Validation de la configuration
      const configValidation = WelcomeFormatter.validateWelcomeConfig(config);
      if (!configValidation.isValid) {
        return {
          success: false,
          errors: configValidation.errors
        };
      }

      // Test des services Discord si un client est disponible
      // Cette partie nécessiterait l'injection du client Discord
      
      return {
        success: true,
        errors: []
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Erreur lors du test: ${error}`]
      };
    }
  }

  /**
   * Obtient les informations de template d'images
   */
  static getImageTemplateInfo(): { welcome: boolean; goodbye: boolean } {
    return WelcomeImageService.getTemplateInfo();
  }

  /**
   * Génère une image de test
   */
  static async generateTestImage(type: 'welcome' | 'goodbye'): Promise<Buffer> {
    return await WelcomeImageService.generateTestImage(type);
  }
}
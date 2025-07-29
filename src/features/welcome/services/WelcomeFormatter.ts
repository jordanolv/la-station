import { User, GuildMember } from 'discord.js';
import { WelcomeConfig } from '../models/welcomeConfig.model';

/**
 * Service de formatage pour la feature Welcome
 * Responsabilité: transformation et formatage des données
 */
export class WelcomeFormatter {
  /**
   * Remplace les placeholders dans un message
   */
  static formatMessage(
    template: string, 
    user: User | GuildMember, 
    guildName?: string
  ): string {
    const actualUser = user instanceof GuildMember ? user.user : user;
    const displayName = user instanceof GuildMember ? 
      (user.displayName || user.user.displayName) : 
      actualUser.displayName;

    let formatted = template
      .replace(/{user}/g, `<@${actualUser.id}>`)
      .replace(/{username}/g, actualUser.username)
      .replace(/{displayName}/g, displayName || actualUser.username)
      .replace(/{tag}/g, actualUser.tag);

    if (guildName) {
      formatted = formatted.replace(/{guild}/g, guildName);
    }

    return formatted;
  }

  /**
   * Formate la configuration pour l'API frontend
   */
  static formatConfigForAPI(config: WelcomeConfig): any {
    return {
      enabled: config.enabled,
      welcomeEnabled: config.welcomeEnabled,
      goodbyeEnabled: config.goodbyeEnabled,
      welcomeChannelId: config.welcomeChannelId,
      goodbyeChannelId: config.goodbyeChannelId,
      welcomeMessage: config.welcomeMessage,
      goodbyeMessage: config.goodbyeMessage,
      generateWelcomeImage: config.generateWelcomeImage,
      generateGoodbyeImage: config.generateGoodbyeImage,
      autoRoles: config.autoRoles || []
    };
  }

  /**
   * Valide un template de message
   */
  static validateMessageTemplate(template: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template || template.trim().length === 0) {
      errors.push('Le message ne peut pas être vide');
    }

    if (template.length > 2000) {
      errors.push('Le message ne peut pas dépasser 2000 caractères');
    }

    // Vérifier les placeholders valides
    const validPlaceholders = ['{user}', '{username}', '{displayName}', '{tag}', '{guild}'];
    const placeholderRegex = /{([^}]+)}/g;
    let match;

    while ((match = placeholderRegex.exec(template)) !== null) {
      const placeholder = match[0];
      if (!validPlaceholders.includes(placeholder)) {
        errors.push(`Placeholder invalide: ${placeholder}. Placeholders valides: ${validPlaceholders.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Génère un nom de fichier pour les images
   */
  static generateImageFilename(userId: string, type: 'welcome' | 'goodbye'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}-${userId}-${timestamp}-${random}.png`;
  }

  /**
   * Formate les informations d'un utilisateur pour le logging
   */
  static formatUserInfo(user: User | GuildMember): string {
    const actualUser = user instanceof GuildMember ? user.user : user;
    const displayName = user instanceof GuildMember ? 
      (user.displayName || user.user.displayName) : 
      actualUser.displayName;

    return `${actualUser.tag} (${displayName || actualUser.username}) [${actualUser.id}]`;
  }

  /**
   * Formate une liste de rôles pour l'affichage
   */
  static formatRolesList(roleIds: string[], guildRoles?: Map<string, any>): string[] {
    if (!guildRoles) {
      return roleIds;
    }

    return roleIds
      .map(roleId => {
        const role = guildRoles.get(roleId);
        return role ? `${role.name} (${roleId})` : roleId;
      })
      .filter(Boolean);
  }

  /**
   * valide la configuration Welcome
   */
  static validateWelcomeConfig(config: Partial<WelcomeConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validation des canaux
    if (config.welcomeEnabled && !config.welcomeChannelId) {
      errors.push('Un canal de bienvenue doit être configuré si les messages de bienvenue sont activés');
    }

    if (config.goodbyeEnabled && !config.goodbyeChannelId) {
      errors.push('Un canal d\'au revoir doit être configuré si les messages d\'au revoir sont activés');
    }

    // Validation des messages
    if (config.welcomeMessage) {
      const welcomeValidation = this.validateMessageTemplate(config.welcomeMessage);
      if (!welcomeValidation.isValid) {
        errors.push(...welcomeValidation.errors.map(e => `Message de bienvenue: ${e}`));
      }
    }

    if (config.goodbyeMessage) {
      const goodbyeValidation = this.validateMessageTemplate(config.goodbyeMessage);
      if (!goodbyeValidation.isValid) {
        errors.push(...goodbyeValidation.errors.map(e => `Message d'au revoir: ${e}`));
      }
    }

    // Validation des rôles automatiques
    if (config.autoRoles && config.autoRoles.length > 10) {
      errors.push('Maximum 10 rôles automatiques autorisés');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Crée un objet de configuration par défaut
   */
  static createDefaultConfig(): WelcomeConfig {
    return {
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
    } as WelcomeConfig;
  }
}
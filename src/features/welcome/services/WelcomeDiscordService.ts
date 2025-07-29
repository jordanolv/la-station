import { 
  Guild, 
  GuildMember, 
  User, 
  TextChannel, 
  Role, 
  AttachmentBuilder,
  Client
} from 'discord.js';
import { WelcomeConfig } from '../models/welcomeConfig.model';
import { WelcomeFormatter } from './WelcomeFormatter';

/**
 * Service pour les interactions Discord de la feature Welcome
 * Responsabilité: gestion des messages, rôles et intégration Discord
 */
export class WelcomeDiscordService {
  /**
   * Envoie un message de bienvenue
   */
  static async sendWelcomeMessage(
    guild: Guild,
    member: GuildMember,
    config: WelcomeConfig,
    imageBuffer?: Buffer
  ): Promise<boolean> {
    try {
      if (!config.welcomeChannelId) {
        console.warn(`[WELCOME] Canal de bienvenue non configuré pour ${guild.id}`);
        return false;
      }

      const channel = guild.channels.cache.get(config.welcomeChannelId);
      if (!channel || !channel.isTextBased()) {
        console.warn(`[WELCOME] Canal de bienvenue invalide: ${config.welcomeChannelId}`);
        return false;
      }

      const message = WelcomeFormatter.formatMessage(
        config.welcomeMessage, 
        member, 
        guild.name
      );

      const messageOptions: any = { content: message };

      if (imageBuffer) {
        const filename = WelcomeFormatter.generateImageFilename(member.user.id, 'welcome');
        const attachment = new AttachmentBuilder(imageBuffer, { name: filename });
        messageOptions.files = [attachment];
      }

      await (channel as TextChannel).send(messageOptions);
      console.log(`[WELCOME] Message de bienvenue envoyé pour ${WelcomeFormatter.formatUserInfo(member)} dans ${guild.name}`);
      
      return true;
    } catch (error) {
      console.error(`[WELCOME] Erreur lors de l'envoi du message de bienvenue:`, error);
      return false;
    }
  }

  /**
   * Envoie un message d'au revoir
   */
  static async sendGoodbyeMessage(
    client: Client,
    guildId: string,
    user: User,
    config: WelcomeConfig,
    imageBuffer?: Buffer
  ): Promise<boolean> {
    try {
      if (!config.goodbyeChannelId) {
        console.warn(`[WELCOME] Canal d'au revoir non configuré pour ${guildId}`);
        return false;
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        console.warn(`[WELCOME] Guild introuvable: ${guildId}`);
        return false;
      }

      const channel = guild.channels.cache.get(config.goodbyeChannelId);
      if (!channel || !channel.isTextBased()) {
        console.warn(`[WELCOME] Canal d'au revoir invalide: ${config.goodbyeChannelId}`);
        return false;
      }

      const message = WelcomeFormatter.formatMessage(
        config.goodbyeMessage, 
        user, 
        guild.name
      );

      const messageOptions: any = { content: message };

      if (imageBuffer) {
        const filename = WelcomeFormatter.generateImageFilename(user.id, 'goodbye');
        const attachment = new AttachmentBuilder(imageBuffer, { name: filename });
        messageOptions.files = [attachment];
      }

      await (channel as TextChannel).send(messageOptions);
      console.log(`[WELCOME] Message d'au revoir envoyé pour ${WelcomeFormatter.formatUserInfo(user)} dans ${guild.name}`);
      
      return true;
    } catch (error) {
      console.error(`[WELCOME] Erreur lors de l'envoi du message d'au revoir:`, error);
      return false;
    }
  }

  /**
   * Attribue les rôles automatiques à un membre
   */
  static async assignAutoRoles(member: GuildMember, roleIds: string[]): Promise<Role[]> {
    if (!roleIds || roleIds.length === 0) {
      return [];
    }

    try {
      const validRoles = roleIds
        .map(roleId => member.guild.roles.cache.get(roleId))
        .filter((role): role is Role => role !== undefined);

      if (validRoles.length === 0) {
        console.warn(`[WELCOME] Aucun rôle valide trouvé dans: ${roleIds.join(', ')}`);
        return [];
      }

      // Filtrer les rôles que le membre n'a pas déjà
      const rolesToAdd = validRoles.filter(role => !member.roles.cache.has(role.id));

      if (rolesToAdd.length === 0) {
        console.log(`[WELCOME] ${WelcomeFormatter.formatUserInfo(member)} a déjà tous les rôles automatiques`);
        return [];
      }

      await member.roles.add(rolesToAdd);
      console.log(`[WELCOME] Rôles automatiques attribués à ${WelcomeFormatter.formatUserInfo(member)}: ${rolesToAdd.map(r => r.name).join(', ')}`);
      
      return rolesToAdd;
    } catch (error) {
      console.error(`[WELCOME] Erreur lors de l'attribution des rôles automatiques:`, error);
      return [];
    }
  }

  /**
   * Valide qu'un canal existe et est accessible
   */
  static async validateChannel(guild: Guild, channelId: string): Promise<boolean> {
    try {
      const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId);
      return channel !== null && channel.isTextBased();
    } catch {
      return false;
    }
  }

  /**
   * Valide qu'un rôle existe et est assignable
   */
  static async validateRole(guild: Guild, roleId: string): Promise<boolean> {
    try {
      const role = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId);
      return role !== null && !role.managed && role.name !== '@everyone';
    } catch {
      return false;
    }
  }

  /**
   * Valide une liste de rôles
   */
  static async validateRoles(guild: Guild, roleIds: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const roleId of roleIds) {
      const isValid = await this.validateRole(guild, roleId);
      if (isValid) {
        valid.push(roleId);
      } else {
        invalid.push(roleId);
      }
    }

    return { valid, invalid };
  }

  /**
   * Récupère les informations détaillées d'un canal
   */
  static async getChannelInfo(guild: Guild, channelId: string): Promise<any | null> {
    try {
      const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId);
      
      if (!channel) return null;

      return {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        isTextBased: channel.isTextBased(),
        parentId: channel.parentId
      };
    } catch {
      return null;
    }
  }

  /**
   * Récupère les informations détaillées d'un rôle
   */
  static async getRoleInfo(guild: Guild, roleId: string): Promise<any | null> {
    try {
      const role = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId);
      
      if (!role) return null;

      return {
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        managed: role.managed,
        mentionable: role.mentionable
      };
    } catch {
      return null;
    }
  }

  /**
   * Teste la configuration Welcome en envoyant un message de test
   */
  static async testWelcomeConfiguration(
    guild: Guild,
    config: WelcomeConfig,
    testUser: User
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Test du canal de bienvenue
    if (config.welcomeEnabled && config.welcomeChannelId) {
      const channelValid = await this.validateChannel(guild, config.welcomeChannelId);
      if (!channelValid) {
        errors.push('Canal de bienvenue invalide ou inaccessible');
      }
    }

    // Test du canal d'au revoir
    if (config.goodbyeEnabled && config.goodbyeChannelId) {
      const channelValid = await this.validateChannel(guild, config.goodbyeChannelId);
      if (!channelValid) {
        errors.push('Canal d\'au revoir invalide ou inaccessible');
      }
    }

    // Test des rôles automatiques
    if (config.autoRoles && config.autoRoles.length > 0) {
      const { invalid } = await this.validateRoles(guild, config.autoRoles);
      if (invalid.length > 0) {
        errors.push(`Rôles automatiques invalides: ${invalid.join(', ')}`);
      }
    }

    return {
      success: errors.length === 0,
      errors
    };
  }
}
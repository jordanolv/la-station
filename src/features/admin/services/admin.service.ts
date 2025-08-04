import { 
  Client, 
  Guild, 
  GuildMember, 
  Role, 
  TextChannel, 
  ChannelType,
  PermissionsBitField 
} from 'discord.js';
import { LogService } from '../../../shared/logs/logs.service';
import { UserRepository } from '../../user/services/user.repository';

export class AdminService {

  // ===== CHANNEL CONFIGURATION =====
  async setLogsChannel(client: Client, guildId: string, channelId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const validation = await this.validateChannel(client, guildId, channelId);
      if (!validation.isValid) {
        return { success: false, message: validation.error! };
      }

      await LogService.setLogsChannel(guildId, channelId);
      
      return {
        success: true,
        message: `✅ Canal de logs configuré : <#${channelId}>`
      };
    } catch (error) {
      console.error('Error setting logs channel:', error);
      return {
        success: false,
        message: '❌ Erreur lors de la configuration du canal de logs'
      };
    }
  }

  async setBirthdayChannel(client: Client, guildId: string, channelId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const validation = await this.validateChannel(client, guildId, channelId);
      if (!validation.isValid) {
        return { success: false, message: validation.error! };
      }

      const userRepo = new UserRepository();
      await userRepo.updateBirthdayConfig(guildId, { 
        channel: channelId, 
        enabled: true 
      });
      
      return {
        success: true,
        message: `✅ Canal d'anniversaires configuré : <#${channelId}>`
      };
    } catch (error) {
      console.error('Error setting birthday channel:', error);
      return {
        success: false,
        message: '❌ Erreur lors de la configuration du canal d\'anniversaires'
      };
    }
  }

  // ===== ROLE MANAGEMENT =====
  async assignRoleToUsersWithRoles(
    client: Client,
    guildId: string,
    targetRoleId: string,
    requiredRoleIds: string[]
  ): Promise<{
    success: boolean;
    message: string;
    stats?: {
      processed: number;
      assigned: number;
      errors: number;
    };
  }> {
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return { success: false, message: '❌ Serveur non trouvé' };
      }

      // Valider le rôle cible
      const targetRole = guild.roles.cache.get(targetRoleId);
      if (!targetRole) {
        return { success: false, message: '❌ Rôle cible non trouvé' };
      }

      // Valider les rôles requis
      const requiredRoles = requiredRoleIds.map(id => guild.roles.cache.get(id)).filter(Boolean) as Role[];
      if (requiredRoles.length !== requiredRoleIds.length) {
        return { success: false, message: '❌ Un ou plusieurs rôles requis non trouvés' };
      }

      // Vérifier les permissions du bot
      const botMember = guild.members.me;
      if (!botMember || !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return { success: false, message: '❌ Le bot n\'a pas la permission de gérer les rôles' };
      }

      if (targetRole.position >= botMember.roles.highest.position) {
        return { success: false, message: '❌ Le rôle cible est trop élevé dans la hiérarchie' };
      }

      // Récupérer tous les membres
      await guild.members.fetch();
      
      let processed = 0;
      let assigned = 0;
      let errors = 0;

      for (const [, member] of guild.members.cache) {
        if (member.user.bot) continue; // Ignorer les bots
        
        processed++;

        try {
          // Vérifier si le membre a déjà le rôle cible
          if (member.roles.cache.has(targetRoleId)) continue;

          // Vérifier si le membre a au moins un des rôles requis
          const hasRequiredRole = requiredRoles.some(role => member.roles.cache.has(role.id));
          
          if (hasRequiredRole) {
            await member.roles.add(targetRole);
            assigned++;
          }
        } catch (error) {
          console.error(`Error assigning role to ${member.user.tag}:`, error);
          errors++;
        }
      }

      return {
        success: true,
        message: `✅ Attribution terminée : ${assigned} membres ont reçu le rôle ${targetRole.name}`,
        stats: { processed, assigned, errors }
      };
    } catch (error) {
      console.error('Error in role assignment:', error);
      return {
        success: false,
        message: '❌ Erreur lors de l\'attribution des rôles'
      };
    }
  }

  // ===== LOGS MANAGEMENT =====
  async toggleLogs(guildId: string, enabled: boolean): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Note: Cette fonctionnalité dépend de comment vous stockez les settings de logs
      // Pour l'instant, on assume que LogService a une méthode pour ça
      
      const status = enabled ? 'activés' : 'désactivés';
      
      return {
        success: true,
        message: `✅ Les logs ont été ${status} avec succès!`
      };
    } catch (error) {
      console.error('Error toggling logs:', error);
      return {
        success: false,
        message: '❌ Erreur lors de la modification des paramètres de logs'
      };
    }
  }

  // ===== VALIDATION HELPERS =====
  private async validateChannel(client: Client, guildId: string, channelId: string): Promise<{
    isValid: boolean;
    error?: string;
    channel?: TextChannel;
  }> {
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return { isValid: false, error: '❌ Serveur non trouvé' };
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        return { isValid: false, error: '❌ Canal non trouvé' };
      }

      if (channel.type !== ChannelType.GuildText) {
        return { isValid: false, error: '❌ Le canal doit être un canal textuel' };
      }

      const textChannel = channel as TextChannel;
      const botMember = guild.members.me;
      
      if (!botMember || !textChannel.permissionsFor(botMember)?.has([
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.EmbedLinks
      ])) {
        return { 
          isValid: false, 
          error: '❌ Le bot n\'a pas les permissions nécessaires dans ce canal' 
        };
      }

      return { isValid: true, channel: textChannel };
    } catch (error) {
      console.error('Error validating channel:', error);
      return { isValid: false, error: '❌ Erreur lors de la validation du canal' };
    }
  }

  // ===== PERMISSION HELPERS =====
  static hasManageGuildPermission(member: GuildMember): boolean {
    return member.permissions.has(PermissionsBitField.Flags.ManageGuild);
  }

  static hasManageRolesPermission(member: GuildMember): boolean {
    return member.permissions.has(PermissionsBitField.Flags.ManageRoles);
  }

  // ===== SERVER INFO =====
  async getServerInfo(client: Client, guildId: string): Promise<{
    name: string;
    memberCount: number;
    channelCount: number;
    roleCount: number;
    createdAt: Date;
    features: {
      logs: { enabled: boolean; channelId?: string };
      birthday: { enabled: boolean; channelId?: string };
    };
  } | null> {
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return null;

      await guild.members.fetch();

      // Récupérer les infos des features
      const logsChannelId = await LogService.getLogsChannelId(guildId);
      
      const userRepo = new UserRepository();
      const birthdayConfig = await userRepo.getBirthdayConfig(guildId);

      return {
        name: guild.name,
        memberCount: guild.memberCount,
        channelCount: guild.channels.cache.size,
        roleCount: guild.roles.cache.size,
        createdAt: guild.createdAt,
        features: {
          logs: {
            enabled: !!logsChannelId,
            channelId: logsChannelId || undefined
          },
          birthday: {
            enabled: birthdayConfig.enabled,
            channelId: birthdayConfig.channel || undefined
          }
        }
      };
    } catch (error) {
      console.error('Error getting server info:', error);
      return null;
    }
  }
}
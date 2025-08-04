import { Message } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { AdminService } from '../services/admin.service';

export default {
  name: 'role-assign',
  description: 'Donne un rôle à tous les membres ayant au moins un des rôles spécifiés',
  usage: 'role-assign <rôle_à_donner> <rôle1> [rôle2] [rôle3]...',
  
  async execute(message: Message, args: string[], client: BotClient) {
    try {
      if (!message.guild) {
        return message.reply({
          content: '❌ Cette commande ne peut être utilisée que dans un serveur.'
        });
      }

      // Vérifier les permissions
      if (!message.member?.permissions.has('ManageRoles')) {
        return message.reply({
          content: '❌ Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.'
        });
      }

      if (args.length < 2) {
        return message.reply({
          content: '❌ Usage: `role-assign <rôle_à_donner> <rôle1> [rôle2]...`\nExemple: `role-assign @Membre @Visiteur @Invité`'
        });
      }

      // Récupérer le rôle à donner
      const targetRoleName = args[0].replace(/<@&|>/g, '');
      const targetRole = message.guild.roles.cache.find(r => 
        r.id === targetRoleName || 
        r.name.toLowerCase() === targetRoleName.toLowerCase()
      );

      if (!targetRole) {
        return message.reply({
          content: `❌ Le rôle "${args[0]}" n'a pas été trouvé.`
        });
      }

      // Récupérer les rôles sources
      const sourceRoleIds = [];
      for (let i = 1; i < args.length; i++) {
        const roleName = args[i].replace(/<@&|>/g, '');
        const role = message.guild.roles.cache.find(r => 
          r.id === roleName || 
          r.name.toLowerCase() === roleName.toLowerCase()
        );
        
        if (role) {
          sourceRoleIds.push(role.id);
        } else {
          return message.reply({
            content: `❌ Le rôle "${args[i]}" n'a pas été trouvé.`
          });
        }
      }

      const statusMessage = await message.reply({
        content: '⏳ Recherche des membres et attribution du rôle...'
      });

      const adminService = new AdminService();
      const result = await adminService.assignRoleToUsersWithRoles(
        client,
        message.guild.id,
        targetRole.id,
        sourceRoleIds
      );

      if (!result.success) {
        return statusMessage.edit({
          content: result.message
        });
      }

      await statusMessage.edit({
        content: result.message + (result.stats ? 
          `\n**Membres traités:** ${result.stats.processed}\n**Erreurs:** ${result.stats.errors}` : '')
      });

      // Supprimer le message de commande après 10 secondes
      setTimeout(() => {
        message.delete().catch(console.error);
      }, 10000);

    } catch (error) {
      console.error('Erreur dans la commande role-assign:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
};
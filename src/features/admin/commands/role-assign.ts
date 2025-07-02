import { Message } from 'discord.js';
import { BotClient } from '../../../bot/client';

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
      const sourceRoles = [];
      for (let i = 1; i < args.length; i++) {
        const roleName = args[i].replace(/<@&|>/g, '');
        const role = message.guild.roles.cache.find(r => 
          r.id === roleName || 
          r.name.toLowerCase() === roleName.toLowerCase()
        );
        
        if (role) {
          sourceRoles.push(role);
        } else {
          return message.reply({
            content: `❌ Le rôle "${args[i]}" n'a pas été trouvé.`
          });
        }
      }

      // Vérifier la hiérarchie des rôles
      const botMember = message.guild.members.cache.get(client.user!.id);
      if (!botMember || targetRole.position >= botMember.roles.highest.position) {
        return message.reply({
          content: `❌ Je ne peux pas donner le rôle "${targetRole.name}" car il est plus haut que mon rôle le plus élevé.`
        });
      }

      const statusMessage = await message.reply({
        content: '⏳ Recherche des membres et attribution du rôle...'
      });

      // Récupérer tous les membres du serveur
      await message.guild.members.fetch();

      // Trouver les membres qui ont au moins un des rôles sources
      const membersToUpdate = message.guild.members.cache.filter(member => {
        // Vérifier si le membre a déjà le rôle cible
        if (member.roles.cache.has(targetRole.id)) {
          return false;
        }
        
        // Vérifier si le membre a au moins un des rôles sources
        return sourceRoles.some(sourceRole => member.roles.cache.has(sourceRole.id));
      });

      if (membersToUpdate.size === 0) {
        return statusMessage.edit({
          content: '❌ Aucun membre trouvé avec les rôles spécifiés qui n\'a pas déjà le rôle cible.'
        });
      }

      let successCount = 0;
      let errorCount = 0;

      // Donner le rôle à chaque membre trouvé
      for (const [, member] of membersToUpdate) {
        try {
          await member.roles.add(targetRole);
          successCount++;
        } catch (error) {
          console.error(`Erreur lors de l'attribution du rôle à ${member.user.tag}:`, error);
          errorCount++;
        }
      }

      const sourceRoleNames = sourceRoles.map(r => r.name).join(', ');
      
      await statusMessage.edit({
        content: `✅ Attribution terminée!\n` +
                `**Rôle donné:** ${targetRole.name}\n` +
                `**Rôles sources:** ${sourceRoleNames}\n` +
                `**Membres mis à jour:** ${successCount}\n` +
                `**Erreurs:** ${errorCount}`
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
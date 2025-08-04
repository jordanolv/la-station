import { Message } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { AdminService } from '../services/admin.service';

export default {
  name: 'enable-logs',
  description: 'Active ou désactive les logs',
  usage: 'enable-logs <true|false>',
  
  async execute(message: Message, args: string[], client: BotClient) {
    try {
      if (!message.guild) {
        return message.reply({
          content: '❌ Cette commande ne peut être utilisée que dans un serveur.'
        });
      }

      // Vérifier les permissions
      if (!message.member?.permissions.has('ManageGuild')) {
        return message.reply({
          content: '❌ Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.'
        });
      }

      if (!args.length) {
        return message.reply({
          content: '❌ Veuillez spécifier une valeur (true ou false). Exemple: `enable-logs true`'
        });
      }

      const enableLogs = args[0].toLowerCase() === 'true';
      
      const adminService = new AdminService();
      const result = await adminService.toggleLogs(message.guild.id, enableLogs);
      
      const reply = await message.reply({
        content: result.message
      });

      setTimeout(() => {
        reply.delete().catch(console.error);
        message.delete().catch(console.error);
      }, 5000);
    } catch (error) {
      console.error('Erreur dans la commande enable-logs:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
}; 
import { Message } from 'discord.js';
import { BotClient } from '../../../bot/client';

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
      
      try {
        // Note: Ceci est un exemple. Vous devrez adapter cette partie à votre système de stockage
        // Vous pourriez avoir un modèle GuildModel ou utiliser une autre méthode de stockage
        // Pour l'instant, nous simulons la mise à jour
        
        console.log(`[Admin] Logs ${enableLogs ? 'activés' : 'désactivés'} pour le serveur ${message.guild.name}`);
        
        const reply = await message.reply({
          content: `✅ Les logs ont été ${enableLogs ? 'activés' : 'désactivés'} avec succès!`
        });

        setTimeout(() => {
          reply.delete().catch(console.error);
          message.delete().catch(console.error);
        }, 5000);
      } catch (error) {
        console.error('Erreur lors de la mise à jour des paramètres de la guild:', error);
        await message.reply({
          content: '❌ Une erreur est survenue lors de la mise à jour des paramètres du serveur.'
        });
      }
    } catch (error) {
      console.error('Erreur dans la commande enable-logs:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
}; 
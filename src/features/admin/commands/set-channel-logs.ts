import { Message, TextChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';

export default {
  name: 'set-channel-logs',
  description: 'Définit le salon pour les logs',
  usage: 'set-channel-logs #channel',
  
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

      if (!args.length || !message.mentions.channels.first()) {
        return message.reply({
          content: '❌ Veuillez mentionner un salon textuel. Exemple: `set-channel-logs #logs`'
        });
      }

      const channel = message.mentions.channels.first() as TextChannel;
      
      if (!channel || channel.type !== 0) {
        return message.reply({
          content: '❌ Veuillez mentionner un salon textuel valide.'
        });
      }

      try {
        // Note: Ceci est un exemple. Vous devrez adapter cette partie à votre système de stockage
        // Vous pourriez avoir un modèle GuildModel ou utiliser une autre méthode de stockage
        // Pour l'instant, nous simulons la mise à jour
        
        console.log(`[Admin] Canal de logs défini à ${channel.name} (${channel.id}) pour le serveur ${message.guild.name}`);
        
        const reply = await message.reply({
          content: `✅ Le salon ${channel} a été défini comme salon de logs!`
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
      console.error('Erreur dans la commande set-channel-logs:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
}; 
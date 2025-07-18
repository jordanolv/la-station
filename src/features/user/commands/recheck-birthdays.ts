import { Message } from 'discord.js';
import { BotClient } from '../../../bot/client';
import GuildUserModel from '../models/guild-user.model';
import { formatDate } from '../../../shared/utils/date-format';

export default {
  name: 'recheck-birthdays',
  description: 'Vérifie les anniversaires du jour',
  usage: 'recheck-birthdays',
  
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

      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      
      // Trouver les utilisateurs dont c'est l'anniversaire aujourd'hui
      const users = await GuildUserModel.find({
        guildId: message.guild.id,
        'infos.birthDate': { $exists: true }
      });
      
      const birthdayUsers = users.filter(user => {
        if (!user.infos.birthDate) return false;
        
        const birthDate = new Date(user.infos.birthDate);
        return birthDate.getDate() === day && (birthDate.getMonth() + 1) === month;
      });

      if (birthdayUsers.length === 0) {
        return message.reply({
          content: '🎂 Aucun anniversaire aujourd\'hui!'
        });
      }

      const userList = birthdayUsers.map(user => `- <@${user.discordId}> (${user.name})`).join('\n');
      
      await message.reply({
        content: `🎂 **Anniversaires aujourd'hui (${formatDate(today)}):**\n${userList}`
      });
    } catch (error) {
      console.error('Erreur dans la commande recheck-birthdays:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
}; 
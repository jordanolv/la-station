import { Message, EmbedBuilder, TextChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import GuildUserModel from '../models/guild-user.model';
import BirthdayModel from '../models/birthday.model';
import { toZonedTime } from 'date-fns-tz';

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

      const TZ = 'Europe/Paris';
      const today = toZonedTime(new Date(), TZ);
      const day = today.getDate();
      const month = today.getMonth() + 1;
      
      // Vérifier la configuration des anniversaires
      const birthdayConfig = await BirthdayModel.findOne({ guildId: message.guild.id });
      
      if (!birthdayConfig || !birthdayConfig.enabled) {
        return message.reply({
          content: '❌ Les anniversaires ne sont pas activés sur ce serveur.'
        });
      }

      // Trouver les utilisateurs dont c'est l'anniversaire aujourd'hui
      const users = await GuildUserModel.find({
        guildId: message.guild.id,
        'infos.birthDate': { $exists: true, $ne: null }
      }).exec();
      
      const birthdayUsers = users.filter(user => {
        if (!user.infos.birthDate) return false;
        
        const birthDate = toZonedTime(new Date(user.infos.birthDate), TZ);
        return birthDate.getDate() === day && (birthDate.getMonth() + 1) === month;
      });

      if (birthdayUsers.length === 0) {
        return message.reply({
          content: '🎂 Aucun anniversaire aujourd\'hui!'
        });
      }

      // Obtenir le canal pour les anniversaires
      let channel: TextChannel;
      if (birthdayConfig.channel) {
        const birthdayChannel = message.guild.channels.cache.get(birthdayConfig.channel) as TextChannel;
        if (birthdayChannel) {
          channel = birthdayChannel;
        } else {
          channel = message.guild.systemChannel as TextChannel;
        }
      } else {
        channel = message.guild.systemChannel as TextChannel;
      }

      if (!channel) {
        return message.reply({
          content: '❌ Aucun canal disponible pour envoyer les anniversaires.'
        });
      }

      // Envoyer les annonces d'anniversaire comme le cron
      let announcementsSent = 0;
      
      for (const user of birthdayUsers) {
        const birthDate = toZonedTime(new Date(user.infos.birthDate), TZ);
        const age = today.getFullYear() - birthDate.getFullYear();
        
        const embed = new EmbedBuilder()
          .setTitle('🎉 Joyeux Anniversaire ! 🎉')
          .setDescription(`Aujourd'hui, <@${user.discordId}> fête ses **${age} ans** ! 🎂`)
          .setColor(0xdac1ff)
          .setImage('https://media.tenor.com/Y5xV3j9y2OcAAAAC/birthday-cake.gif')
          .setTimestamp();

        try {
          await channel.send({ embeds: [embed] });
          announcementsSent++;
          
        } catch (error) {
          console.error(`Erreur lors de l'envoi de l'anniversaire pour ${user.name}:`, error);
        }
      }

      await message.reply({
        content: `🎂 **${announcementsSent}/${birthdayUsers.length} anniversaires annoncés** dans ${channel}!`
      });
    } catch (error) {
      console.error('Erreur dans la commande recheck-birthdays:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.'
      });
    }
  }
}; 
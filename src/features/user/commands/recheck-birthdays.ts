import { Message, TextChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';
import UserModel from '../models/user.model';
import AppConfigModel from '../../discord/models/app-config.model';
import { toZonedTime } from 'date-fns-tz';
import { sendBirthdayAnnouncement, BIRTHDAY_TZ } from '../services/birthday.service';

export default {
  name: 'recheck-birthdays',
  description: 'Vérifie les anniversaires du jour',
  usage: 'recheck-birthdays',

  async execute(message: Message, _args: string[], client: BotClient) {
    try {
      if (!message.member?.permissions.has('ManageGuild')) {
        return message.reply({ content: '❌ Vous n\'avez pas les permissions nécessaires.' });
      }

      const today = toZonedTime(new Date(), BIRTHDAY_TZ);
      const day = today.getDate();
      const month = today.getMonth() + 1;

      const guildDoc = await AppConfigModel.findOne({});
      const birthdayConfig = guildDoc?.features?.birthday;

      if (!birthdayConfig?.enabled) {
        return message.reply({ content: '❌ Les anniversaires ne sont pas activés sur ce serveur.' });
      }

      const birthdayChannelId = birthdayConfig.channel || message.guild?.systemChannelId;
      const channel = birthdayChannelId
        ? (message.guild?.channels.cache.get(birthdayChannelId) as TextChannel ?? null)
        : null;

      if (!channel) {
        return message.reply({ content: '❌ Aucun canal disponible pour envoyer les anniversaires.' });
      }

      const users = await UserModel.find({ 'infos.birthDate': { $exists: true, $ne: null } });
      const birthdayUsers = users.filter(u => {
        if (!u.infos.birthDate) return false;
        const bd = toZonedTime(new Date(u.infos.birthDate), BIRTHDAY_TZ);
        return bd.getDate() === day && bd.getMonth() + 1 === month;
      });

      if (birthdayUsers.length === 0) {
        return message.reply({ content: '🎂 Aucun anniversaire aujourd\'hui !' });
      }

      let sent = 0;
      for (const user of birthdayUsers) {
        try {
          await sendBirthdayAnnouncement(client, channel, user.discordId, user.name, user.infos.birthDate!);
          sent++;
        } catch (err) {
          console.error(`Erreur anniversaire ${user.name}:`, err);
        }
      }

      await message.reply({ content: `🎂 **${sent}/${birthdayUsers.length} anniversaires annoncés** dans ${channel} !` });
    } catch (err) {
      console.error('Erreur recheck-birthdays:', err);
      await message.reply({ content: '❌ Une erreur est survenue.' });
    }
  },
};

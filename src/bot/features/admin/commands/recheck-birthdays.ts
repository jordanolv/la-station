import { Message } from 'discord.js';
import { CronManager } from '../../../cron';
import { BotClient } from '../../../BotClient';
import { IGuild } from '@/database/models/Guild';

export default {
  name: 'recheck-birthdays',
  description: 'Relance manuellement la vérification des anniversaires (admin)',
  usage: 'recheck-birthdays',

  async execute(message: Message, args: string[], guildData: IGuild) {
    try {
      // On récupère le client du bot
      const client = message.client;
      const cronManager = new CronManager(client);
      const birthdayCron = cronManager.getBirthdayCron();
      await birthdayCron.checkBirthdays();
      await message.reply({
        content: '✅ Vérification des anniversaires relancée !',
      });
    } catch (error) {
      console.error('Erreur dans la commande recheck-birthdays:', error);
      await message.reply({
        content: '❌ Une erreur est survenue lors de la relance des anniversaires.'
      });
    }
  }
}; 
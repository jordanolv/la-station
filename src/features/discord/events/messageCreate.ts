import { Events, Message } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { StatsService } from '../../stats/services/stats.service';
import { AppConfigService } from '../services/app-config.service';
import { LevelingService } from '@/features/leveling/services/leveling.service';
import { ChatGamingService } from '../../chat-gaming/services/chat-gaming.service';
import { SuggestionService } from '../../suggestion/services/suggestion.service';
import { UserService } from '../../user/services/user.service';
import { BingoService } from '../../arcade/bingo/services/bingo.service';
import { JustePrixService } from '../../arcade/juste-prix/services/juste-prix.service';
import { getGuildId } from '../../../shared/guild';

export default {
  name: Events.MessageCreate,
  once: false,

  async execute(client: BotClient, message: Message) {
    try {
      if (message.author?.bot) return;
      if (!message.guild) return;

      const guildData = await AppConfigService.getOrCreateConfig();
      if (!guildData) return;

      // Post quiz : lecture seule, tout passe par les boutons — on supprime les messages.
      if (guildData.config.channels?.quiz === message.channelId) {
        await message.delete().catch(() => {});
        return;
      }

      const prefix = guildData.config.prefix;

      if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName) return;

        const command = client.commands.get(commandName);
        if (command) {
          try {
            await command.execute(message, args, client);
          } catch (error) {
            console.error(`Erreur lors de l'exécution de la commande ${commandName}:`, error);
            message.reply('Une erreur est survenue lors de l\'exécution de la commande.').catch(console.error);
          }
        }
      }

      await StatsService.incrementMessageCount(client, message.author.id, message.author.username);
      await UserService.updateDailyStreak(message.author.id);
      await LevelingService.giveXpToUser(client, message);
      await ChatGamingService.checkAndRemindGamingRole(message);
      await SuggestionService.handleMessage(message);
      await BingoService.handleMessage(message, client);
      await JustePrixService.handleMessage(message, client);

    } catch (error) {
      console.error('Erreur dans l\'événement messageCreate:', error);
    }
  }
};

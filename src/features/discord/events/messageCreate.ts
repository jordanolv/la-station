import { Events, Message } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { StatsService } from '../../stats/services/stats.service';
import { GuildService } from '../services/guild.service';
import { SuggestionsService } from '../../suggestions/services/suggestions.service';
import { LevelingService } from '@/features/leveling/services/leveling.service';
import { ChatGamingService } from '../../chat-gaming/services/chatGaming.service';

export default {
  name: Events.MessageCreate,
  once: false,

  async execute(client: BotClient, message: Message) {
    try {
      // Ignorer les messages des bots
      if (message.author?.bot) return;
      
      // Ignorer les messages en DM
      if (!message.guild) return;
      
      // Récupérer la guild
      const guildData = await GuildService.getOrCreateGuild(message.guild.id, message.guild.name);
      if(!guildData) return;
      
      // Traiter les commandes préfixées
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
      
      // Vérifier si le message est dans un channel de suggestions
      await SuggestionsService.handleChannelMessage(message);
      
      // Mettre à jour les statistiques de l'utilisateur (messages)
      await StatsService.incrementMessageCount(
        client,
        message.author.id,
        message.guild.id,
        message.author.username
      );
      
      // Gérer le système de leveling
      await LevelingService.giveXpToUser(client, message);
      
      // Vérifier et rappeler le rôle gaming si nécessaire
      await ChatGamingService.checkAndRemindGamingRole(message);

    } catch (error) {
      console.error('Erreur dans l\'événement messageCreate:', error);
    }
  }
}; 
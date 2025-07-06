import { Events, MessageReaction, User } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { GuildService } from '../services/guild.service';
import { ChatGamingService } from '../../chat-gaming/services/chatGaming.service';
import { SuggestionsService } from '../../suggestions/services/suggestions.service';
import { PartyService } from '../../party/services/party.service';

export default {
  name: Events.MessageReactionRemove,
  once: false,

  async execute(client: BotClient, reaction: MessageReaction, user: User) {
    // Ignorer les réactions des bots
    if (user.bot) return;
    
    // Si la réaction est partielle, la récupérer complètement
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        return;
      }
    }

    // Vérifier que la réaction est sur un message dans une guilde
    if (!reaction.message.guild) return;

    // Récupérer ou créer les données de la guilde
    const guildData = await GuildService.getOrCreateGuild(
      reaction.message.guild.id, 
      reaction.message.guild.name
    );

    
    // Gérer les réactions pour les jeux (chat-gaming feature)
    await ChatGamingService.handleReactionRemove(reaction, user);
    
    // Gérer les réactions pour les suggestions
    await SuggestionsService.handleReactionRemove(reaction, user);
    
    // Gérer les réactions pour les événements/soirées (party feature)
    if (reaction.emoji.name === '🎉') {
      await PartyService.handleReactionRemove(client, reaction.message.id, user.id);
    }

    // Ici, vous pourriez ajouter du code pour d'autres systèmes:
    // 1. Fermer des tickets
    // 2. Autres systèmes de réaction
    
    // Exemple d'émission d'un événement personnalisé que vous pourriez créer dans le futur:
    // client.emit('reactionRoleRemove', reaction, user, guildData);
  }
};

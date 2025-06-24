import { Events, MessageReaction, User } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { GuildService } from '../services/guild.service';
import { ChatGamingService } from '../../chat-gaming/chatGaming.service';
import { SuggestionsService } from '../../suggestions/suggestions.service';

export default {
  name: Events.MessageReactionAdd,
  once: false,

  async execute(client: BotClient, reaction: MessageReaction, user: User) {
    // Ignorer les réactions des bots
    if (user.bot) return;
    
    // Si la réaction est partielle, la récupérer complètement
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Erreur lors de la récupération de la réaction:', error);
        return;
      }
    }

    // Vérifier que la réaction est sur un message dans une guilde
    if (!reaction.message.guild) return;

    // Récupérer ou créer les données de la guilde
    await GuildService.getOrCreateGuild(
      reaction.message.guild.id, 
      reaction.message.guild.name
    );

    // Logging pour debug
    console.log(`Réaction ${reaction.emoji.name} ajoutée par ${user.tag} sur le message ${reaction.message.id}`);
    
    // Gérer les réactions pour les jeux (chat-gaming feature)
    await ChatGamingService.handleReactionAdd(reaction, user);
    
    // Gérer les réactions pour les suggestions
    await SuggestionsService.handleReactionAdd(reaction, user);
    
    // Ici, vous pourriez ajouter du code pour d'autres systèmes:
    // 1. Gérer les tickets
    // 2. Autres systèmes de réaction
    
    // Exemple d'émission d'un événement personnalisé que vous pourriez créer dans le futur:
    // client.emit('reactionRoleAdd', reaction, user, guildData);
  }
};

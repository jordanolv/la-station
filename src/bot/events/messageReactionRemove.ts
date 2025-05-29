import { Events, MessageReaction, User } from 'discord.js';
import { BotClient } from '../client';
import { GuildService } from '../services/guild.service';

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
        console.error('Erreur lors de la récupération de la réaction:', error);
        return;
      }
    }

    // Vérifier que la réaction est sur un message dans une guilde
    if (!reaction.message.guild) return;

    // Récupérer les données de la guilde
    const guildData = await GuildService.getGuild(reaction.message.guild.id);
    if (!guildData) return;

    // Logging pour debug
    console.log(`Réaction ${reaction.emoji.name} retirée par ${user.tag} sur le message ${reaction.message.id}`);
    
    // Ici, vous pourriez ajouter du code pour:
    // 1. Retirer des rôles par réaction
    // 2. Fermer des tickets
    // 3. Autres systèmes de réaction
    
    // Exemple d'émission d'un événement personnalisé que vous pourriez créer dans le futur:
    // client.emit('reactionRoleRemove', reaction, user, guildData);
  }
};

import { ForumChannel, Guild } from "discord.js";
import { BotClient } from '../../../../BotClient';
import { GameService } from '../../../../../database/services/GameService';

export default {
  name: 'fg-addRole',
  once: false,

  async execute(client: BotClient, messageReaction: any, user: any, guildData: any) {
    if (!guildData) return;
    if (!user) return;

    const userId = user.id;

    // Trouver le jeu qui a une réaction sur ce message
    const game = await GameService.findByMessageId(messageReaction.message.id);
    
    if (game && game.reactions) {
      // Vérifier si une des réactions du jeu correspond à la réaction actuelle
      const matchingReaction = game.reactions.find(
        (reaction) => 
          reaction.emoji === messageReaction.emoji.name && 
          reaction.messageId === messageReaction.message.id
      );

      if (matchingReaction) {
        const role = messageReaction.message.guild.roles.cache.get(matchingReaction.roleId);
        const member = messageReaction.message.guild.members.cache.get(userId);
        
        if (member.user.bot) return;
        if (role && member) {
          member.roles.add(role);
        }
        return;
      }
    }
  }
};
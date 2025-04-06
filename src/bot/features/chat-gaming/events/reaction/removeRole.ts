import { ForumChannel, Guild } from "discord.js";
import { BotClient } from '../../../../BotClient';
import { GameService } from '../../../../../database/services/GameService';
import * as Sentry from '@sentry/node';

export default {
  name: 'fg-removeRole',
  once: false,

  async execute(client: BotClient, messageReaction: any, user: any, guildData: any) {
    try {
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

          if (member?.user.bot) return;

          if (role && member) {
            member.roles.remove(role);
          }
        }
      }
    } catch (error) {
      console.error("Erreur dans l'événement fg-removeRole:", error);

      // 👇 Log vers Sentry avec contexte
      Sentry.withScope(scope => {
        scope.setTag('event', 'fg-removeRole');
        scope.setUser({ id: user?.id, username: user?.username });
        scope.setContext('MessageReaction', {
          emoji: messageReaction?.emoji?.name,
          messageId: messageReaction?.message?.id,
          guildId: messageReaction?.message?.guild?.id,
        });
        Sentry.captureException(error);
      });
    }
  }
};

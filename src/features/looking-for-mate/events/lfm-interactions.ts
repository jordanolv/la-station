import {
  ButtonInteraction,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import LFMService from '../services/lfm.service';
import GameDBService from '../services/game-db.service';
import { BotClient } from '../../../bot/client';

/**
 * Handle LFM button interactions
 */
export async function handleLFMButtonInteraction(
  interaction: ButtonInteraction,
  client: BotClient
): Promise<void> {
  const customId = interaction.customId;

  // Extract action and request ID from customId (format: lfm_{action}_{requestId})
  const parts = customId.split('_');
  if (parts.length !== 3 || parts[0] !== 'lfm') {
    return;
  }

  const action = parts[1];
  const requestId = parts[2];

  try {
    await interaction.deferUpdate();

    const request = await LFMService.getRequest(requestId);

    if (!request) {
      await interaction.followUp({
        content: '❌ Cette annonce n\'existe plus ou a été supprimée.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    switch (action) {
      case 'join':
        await handleJoin(interaction, requestId);
        break;
      case 'leave':
        await handleLeave(interaction, requestId);
        break;
      case 'complete':
        await handleComplete(interaction, requestId);
        break;
      case 'cancel':
        await handleCancel(interaction, requestId);
        break;
      default:
        await interaction.followUp({
          content: '❌ Action non reconnue.',
          flags: MessageFlags.Ephemeral,
        });
    }
  } catch (error) {
    console.error('Error handling LFM button interaction:', error);
    await interaction.followUp({
      content: '❌ Une erreur est survenue lors du traitement de votre demande.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Handle join button click
 */
async function handleJoin(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const request = await LFMService.getRequest(requestId);

  if (!request) {
    await interaction.followUp({
      content: '❌ Cette annonce n\'existe plus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if user is the request owner
  if (request.userId === interaction.user.id) {
    await interaction.followUp({
      content: '❌ Vous ne pouvez pas rejoindre votre propre annonce.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if request is still open
  if (request.status !== 'open') {
    await interaction.followUp({
      content: '❌ Cette annonce n\'est plus ouverte.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if user already joined
  if (request.interestedUsers.includes(interaction.user.id)) {
    await interaction.followUp({
      content: '⚠️ Vous avez déjà manifesté votre intérêt pour cette annonce.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Add user to interested list
  const updatedRequest = await LFMService.addInterestedUser(requestId, interaction.user.id);

  if (!updatedRequest) {
    await interaction.followUp({
      content: '❌ Impossible de rejoindre cette annonce.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Update the message embed
  const requestOwner = await interaction.client.users.fetch(request.userId);
  const gameColor = await GameDBService.getGameColor(request.guildId, updatedRequest.game);
  const gameBanner = await GameDBService.getGameBanner(request.guildId, updatedRequest.game);
  const embed = LFMService.createLFMEmbed(updatedRequest, requestOwner, gameColor, gameBanner);
  const buttons = LFMService.createLFMButtons(requestId, false);

  await interaction.editReply({
    embeds: [embed],
    components: [buttons],
  });

  // Notify the user
  await interaction.followUp({
    content: `✅ Vous avez rejoint l'annonce ! Le créateur (<@${request.userId}>) a été notifié.`,
    flags: MessageFlags.Ephemeral,
  });

  // Try to DM the request owner
  try {
    await requestOwner.send({
      embeds: [
        new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('✋ Nouveau joueur intéressé !')
          .setDescription(`<@${interaction.user.id}> est intéressé par votre annonce LFM pour **${request.game}**.`)
          .addFields(
            { name: '🎯 Jeu', value: request.game, inline: true },
            { name: '👥 Joueurs recherchés', value: request.numberOfMates.toString(), inline: true },
            { name: '⭐ Rank', value: request.rank || 'Non spécifié', inline: true }
          )
          .setTimestamp(),
      ],
    });
  } catch (error) {
    console.error('Failed to send DM to request owner:', error);
  }
}

/**
 * Handle leave button click
 */
async function handleLeave(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const request = await LFMService.getRequest(requestId);

  if (!request) {
    await interaction.followUp({
      content: '❌ Cette annonce n\'existe plus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if user is in the interested list
  if (!request.interestedUsers.includes(interaction.user.id)) {
    await interaction.followUp({
      content: '⚠️ Vous n\'êtes pas dans la liste des joueurs intéressés.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Remove user from interested list
  const updatedRequest = await LFMService.removeInterestedUser(requestId, interaction.user.id);

  if (!updatedRequest) {
    await interaction.followUp({
      content: '❌ Impossible de quitter cette annonce.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Update the message embed
  const requestOwner = await interaction.client.users.fetch(request.userId);
  const gameColor = await GameDBService.getGameColor(request.guildId, updatedRequest.game);
  const gameBanner = await GameDBService.getGameBanner(request.guildId, updatedRequest.game);
  const embed = LFMService.createLFMEmbed(updatedRequest, requestOwner, gameColor, gameBanner);
  const buttons = LFMService.createLFMButtons(requestId, false);

  await interaction.editReply({
    embeds: [embed],
    components: [buttons],
  });

  await interaction.followUp({
    content: '✅ Vous avez quitté l\'annonce.',
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Handle complete button click (owner only)
 */
async function handleComplete(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const request = await LFMService.getRequest(requestId);

  if (!request) {
    await interaction.followUp({
      content: '❌ Cette annonce n\'existe plus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if user is the request owner
  if (request.userId !== interaction.user.id) {
    await interaction.followUp({
      content: '❌ Seul le créateur de l\'annonce peut la marquer comme complète.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Update status to completed
  const updatedRequest = await LFMService.updateStatus(requestId, 'completed');

  if (!updatedRequest) {
    await interaction.followUp({
      content: '❌ Impossible de marquer cette annonce comme complète.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Update the message embed
  const gameColor = await GameDBService.getGameColor(request.guildId, updatedRequest.game);
  const gameBanner = await GameDBService.getGameBanner(request.guildId, updatedRequest.game);
  const embed = LFMService.createLFMEmbed(updatedRequest, interaction.user, gameColor, gameBanner);

  // Remove buttons
  await interaction.editReply({
    embeds: [embed],
    components: [],
  });

  await interaction.followUp({
    content: '✅ Annonce marquée comme complète ! Bon jeu ! 🎮',
    flags: MessageFlags.Ephemeral,
  });

  // Notify interested users
  for (const userId of request.interestedUsers) {
    try {
      const user = await interaction.client.users.fetch(userId);
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Groupe complet !')
            .setDescription(`L'annonce LFM pour **${request.game}** que vous avez rejoint est maintenant complète.`)
            .addFields(
              { name: '👤 Créateur', value: `<@${request.userId}>`, inline: true },
              { name: '🎯 Jeu', value: request.game, inline: true }
            )
            .setTimestamp(),
        ],
      });
    } catch (error) {
      console.error(`Failed to send DM to user ${userId}:`, error);
    }
  }
}

/**
 * Handle cancel button click (owner only)
 */
async function handleCancel(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const request = await LFMService.getRequest(requestId);

  if (!request) {
    await interaction.followUp({
      content: '❌ Cette annonce n\'existe plus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if user is the request owner
  if (request.userId !== interaction.user.id) {
    await interaction.followUp({
      content: '❌ Seul le créateur de l\'annonce peut l\'annuler.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Update status to cancelled
  const updatedRequest = await LFMService.updateStatus(requestId, 'cancelled');

  if (!updatedRequest) {
    await interaction.followUp({
      content: '❌ Impossible d\'annuler cette annonce.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Update the message embed
  const gameColor = await GameDBService.getGameColor(request.guildId, updatedRequest.game);
  const gameBanner = await GameDBService.getGameBanner(request.guildId, updatedRequest.game);
  const embed = LFMService.createLFMEmbed(updatedRequest, interaction.user, gameColor, gameBanner);

  // Remove buttons
  await interaction.editReply({
    embeds: [embed],
    components: [],
  });

  await interaction.followUp({
    content: '✅ Annonce annulée.',
    flags: MessageFlags.Ephemeral,
  });

  // Notify interested users
  for (const userId of request.interestedUsers) {
    try {
      const user = await interaction.client.users.fetch(userId);
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🔴 Annonce annulée')
            .setDescription(`L'annonce LFM pour **${request.game}** que vous avez rejoint a été annulée par son créateur.`)
            .addFields(
              { name: '👤 Créateur', value: `<@${request.userId}>`, inline: true },
              { name: '🎯 Jeu', value: request.game, inline: true }
            )
            .setTimestamp(),
        ],
      });
    } catch (error) {
      console.error(`Failed to send DM to user ${userId}:`, error);
    }
  }
}

import {
  ButtonInteraction,
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from 'discord.js';
import LFMService from '../services/lfm.service';
import LFMGamesConfigService from '../services/lfm-games-config.service';
import { BotClient } from '../../../bot/client';

export async function handleLFMButtonInteraction(
  interaction: ButtonInteraction,
  client: BotClient
): Promise<void> {
  const customId = interaction.customId;

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
      case 'ping':
        await handlePing(interaction, requestId);
        break;
      case 'delete':
        await handleDelete(interaction, requestId);
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

async function handleJoin(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const request = await LFMService.getRequest(requestId);

  if (!request) {
    await interaction.followUp({
      content: '❌ Cette annonce n\'existe plus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (request.status !== 'open') {
    await interaction.followUp({
      content: '❌ Cette annonce n\'est plus ouverte.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (request.interestedUsers.includes(interaction.user.id)) {
    await interaction.followUp({
      content: '⚠️ Vous avez déjà manifesté votre intérêt pour cette annonce.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const requestOwner = await interaction.client.users.fetch(request.userId);

  const isRanked = request.rank && request.rank !== 'Casual' && request.rank !== 'Privé';

  if (!isRanked) {
    const updatedRequest = await LFMService.addInterestedUser(requestId, interaction.user.id);

    if (!updatedRequest) {
      await interaction.followUp({
        content: '❌ Impossible de rejoindre cette annonce.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const gameColor = LFMGamesConfigService.getGameColor(updatedRequest.game);
    const gameBanner = LFMGamesConfigService.getGameBanner(updatedRequest.game);
    const embed = LFMService.createLFMEmbed(updatedRequest, requestOwner, gameColor, gameBanner);
    const buttons = LFMService.createLFMButtons(requestId, true);

    await interaction.message.edit({ embeds: [embed], components: [buttons] });

    await interaction.followUp({
      content: '✅ Vous avez rejoint le lobby !',
      flags: MessageFlags.Ephemeral,
    });

    try {
      await requestOwner.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✋ Nouveau joueur !')
            .setDescription(`**${interaction.user.username}** a rejoint votre lobby **${request.game}**.`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
              { name: '🎯 Jeu', value: request.game, inline: true },
              { name: '👥 Places', value: `${updatedRequest.interestedUsers.length}/${request.numberOfMates}`, inline: true }
            )
            .setTimestamp(),
        ],
      });
    } catch (error) {
      console.error('Failed to send DM to request owner:', error);
    }

    return;
  }

  await interaction.followUp({
    content: `⏳ Votre demande a été envoyée au créateur (<@${request.userId}>). En attente de validation...`,
    flags: MessageFlags.Ephemeral,
  });

  try {
    const dmEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✋ Nouveau joueur intéressé !')
      .setDescription(`**${interaction.user.username}** (<@${interaction.user.id}>) souhaite rejoindre votre lobby **${request.game}**.`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: '🎯 Jeu', value: request.game, inline: true },
        { name: '👥 Places', value: `${request.interestedUsers.length}/${request.numberOfMates}`, inline: true },
        { name: '⭐ Rank', value: request.rank || 'Non spécifié', inline: true }
      )
      .setTimestamp();

    const acceptButton = new ButtonBuilder()
      .setCustomId(`lfm_accept_${requestId}_${interaction.user.id}`)
      .setLabel('Accepter')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅');

    const rejectButton = new ButtonBuilder()
      .setCustomId(`lfm_reject_${requestId}_${interaction.user.id}`)
      .setLabel('Refuser')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌');

    await requestOwner.send({
      embeds: [dmEmbed],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton, rejectButton)],
    });
  } catch (error) {
    console.error('Failed to send DM to request owner:', error);

    const updatedRequest = await LFMService.addInterestedUser(requestId, interaction.user.id);

    if (updatedRequest) {
      const gameColor = LFMGamesConfigService.getGameColor(updatedRequest.game);
      const gameBanner = LFMGamesConfigService.getGameBanner(updatedRequest.game);
      const embed = LFMService.createLFMEmbed(updatedRequest, requestOwner, gameColor, gameBanner);
      const buttons = LFMService.createLFMButtons(requestId, true);

      await interaction.message.edit({ embeds: [embed], components: [buttons] });

      await interaction.followUp({
        content: '✅ Vous avez été automatiquement accepté dans le lobby !',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

async function handleLeave(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const request = await LFMService.getRequest(requestId);

  if (!request) {
    await interaction.followUp({
      content: '❌ Cette annonce n\'existe plus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!request.interestedUsers.includes(interaction.user.id)) {
    await interaction.followUp({
      content: '⚠️ Vous n\'êtes pas dans la liste des joueurs intéressés.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const updatedRequest = await LFMService.removeInterestedUser(requestId, interaction.user.id);

  if (!updatedRequest) {
    await interaction.followUp({
      content: '❌ Impossible de quitter cette annonce.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const requestOwner = await interaction.client.users.fetch(request.userId);
  const gameColor = LFMGamesConfigService.getGameColor(updatedRequest.game);
  const gameBanner = LFMGamesConfigService.getGameBanner(updatedRequest.game);
  const embed = LFMService.createLFMEmbed(updatedRequest, requestOwner, gameColor, gameBanner);
  const buttons = LFMService.createLFMButtons(requestId, true);

  await interaction.message.edit({ embeds: [embed], components: [buttons] });

  await interaction.followUp({
    content: '✅ Vous avez quitté l\'annonce.',
    flags: MessageFlags.Ephemeral,
  });
}

async function handleComplete(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const request = await LFMService.getRequest(requestId);

  if (!request) {
    await interaction.followUp({
      content: '❌ Cette annonce n\'existe plus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (request.userId !== interaction.user.id) {
    await interaction.followUp({
      content: '❌ Seul le créateur de l\'annonce peut la marquer comme complète.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const updatedRequest = await LFMService.updateStatus(requestId, 'completed');

  if (!updatedRequest) {
    await interaction.followUp({
      content: '❌ Impossible de marquer cette annonce comme complète.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const gameColor = LFMGamesConfigService.getGameColor(updatedRequest.game);
  const gameBanner = LFMGamesConfigService.getGameBanner(updatedRequest.game);
  const embed = LFMService.createLFMEmbed(updatedRequest, interaction.user, gameColor, gameBanner);

  await interaction.message.edit({ embeds: [embed], components: [] });

  await interaction.followUp({
    content: '✅ Annonce marquée comme complète ! Bon jeu ! 🎮',
    flags: MessageFlags.Ephemeral,
  });

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

async function handleCancel(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const request = await LFMService.getRequest(requestId);

  if (!request) {
    await interaction.followUp({
      content: '❌ Cette annonce n\'existe plus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (request.userId !== interaction.user.id) {
    await interaction.followUp({
      content: '❌ Seul le créateur de l\'annonce peut l\'annuler.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const updatedRequest = await LFMService.updateStatus(requestId, 'cancelled');

  if (!updatedRequest) {
    await interaction.followUp({
      content: '❌ Impossible d\'annuler cette annonce.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const gameColor = LFMGamesConfigService.getGameColor(updatedRequest.game);
  const gameBanner = LFMGamesConfigService.getGameBanner(updatedRequest.game);
  const embed = LFMService.createLFMEmbed(updatedRequest, interaction.user, gameColor, gameBanner);

  await interaction.message.edit({ embeds: [embed], components: [] });

  await interaction.followUp({
    content: '✅ Annonce annulée.',
    flags: MessageFlags.Ephemeral,
  });

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

async function handlePing(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const request = await LFMService.getRequest(requestId);

  if (!request) {
    await interaction.followUp({
      content: '❌ Cette annonce n\'existe plus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (request.userId !== interaction.user.id) {
    await interaction.followUp({
      content: '❌ Seul le créateur peut pinger les participants.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const others = request.interestedUsers.filter((id) => id !== request.userId);

  if (others.length === 0) {
    await interaction.followUp({
      content: '⚠️ Aucun participant à pinger pour l\'instant.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const mentions = others.map((id) => `<@${id}>`).join(' ');

  if (request.threadId) {
    try {
      const thread = await interaction.client.channels.fetch(request.threadId);
      if (thread?.isThread()) {
        await thread.send({ content: `📣 ${mentions}` });
        await interaction.followUp({ content: '📣 Participants pingés dans le thread !', flags: MessageFlags.Ephemeral });
        return;
      }
    } catch (error) {
      console.error('Failed to ping in thread:', error);
    }
  }

  await interaction.followUp({ content: `📣 ${mentions}` });
}

async function handleDelete(interaction: ButtonInteraction, requestId: string): Promise<void> {
  const request = await LFMService.getRequest(requestId);

  if (!request) {
    await interaction.followUp({
      content: '❌ Cette annonce n\'existe plus.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (request.userId !== interaction.user.id) {
    await interaction.followUp({
      content: '❌ Seul le créateur de l\'annonce peut la supprimer.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferUpdate();

  await LFMService.deleteRequest(requestId);

  try {
    await interaction.message.delete();
  } catch (error) {
    console.error('Failed to delete message:', error);
  }

  await interaction.followUp({
    content: '🗑️ Votre annonce a été supprimée avec succès.',
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleLFMAcceptReject(
  interaction: ButtonInteraction,
  client: BotClient
): Promise<void> {
  const customId = interaction.customId;

  const parts = customId.split('_');
  if (parts.length !== 4) return;

  const action = parts[1];
  const requestId = parts[2];
  const userId = parts[3];

  const request = await LFMService.getRequest(requestId);

  if (!request) {
    await interaction.reply({ content: '❌ Cette annonce n\'existe plus.', ephemeral: true });
    return;
  }

  if (request.userId !== interaction.user.id) {
    await interaction.reply({ content: '❌ Seul le créateur de l\'annonce peut accepter/refuser.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();

  const applicant = await client.users.fetch(userId);

  if (action === 'accept') {
    const updatedRequest = await LFMService.addInterestedUser(requestId, userId);

    if (!updatedRequest) {
      await interaction.followUp({ content: '❌ Impossible d\'ajouter ce joueur.', ephemeral: true });
      return;
    }

    try {
      const channel = await client.channels.fetch(request.channelId!);
      if (channel?.isTextBased()) {
        const message = await channel.messages.fetch(request.messageId!);
        const gameColor = LFMGamesConfigService.getGameColor(updatedRequest.game);
        const gameBanner = LFMGamesConfigService.getGameBanner(updatedRequest.game);
        const embed = LFMService.createLFMEmbed(updatedRequest, interaction.user, gameColor, gameBanner);
        const buttons = LFMService.createLFMButtons(requestId, true);
        await message.edit({ embeds: [embed], components: [buttons] });
      }
    } catch (error) {
      console.error('Failed to update lobby message:', error);
    }

    try {
      await applicant.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Demande acceptée !')
            .setDescription(`Votre demande pour rejoindre le lobby **${request.game}** a été acceptée par <@${request.userId}> !`)
            .setTimestamp(),
        ],
      });
    } catch (error) {
      console.error('Failed to send DM to applicant:', error);
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('✅ Joueur accepté')
          .setDescription(`Vous avez accepté **${applicant.username}** dans votre lobby **${request.game}**.`)
          .setTimestamp(),
      ],
      components: [],
    });
  } else {
    try {
      await applicant.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Demande refusée')
            .setDescription(`Votre demande pour rejoindre le lobby **${request.game}** a été refusée par le créateur.`)
            .setTimestamp(),
        ],
      });
    } catch (error) {
      console.error('Failed to send DM to applicant:', error);
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Joueur refusé')
          .setDescription(`Vous avez refusé **${applicant.username}** pour votre lobby **${request.game}**.`)
          .setTimestamp(),
      ],
      components: [],
    });
  }
}

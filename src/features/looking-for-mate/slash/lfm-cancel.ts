import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import LFMService from '../services/lfm.service';
import GameDBService from '../services/game-db.service';

export default {
  data: new ContextMenuCommandBuilder()
    .setName('Annuler LFM')
    .setType(ApplicationCommandType.Message),

  async execute(interaction: MessageContextMenuCommandInteraction, _client: BotClient) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const message = interaction.targetMessage;

      // Check if message is from the bot
      if (message.author.id !== interaction.client.user?.id) {
        await interaction.editReply({
          content: '❌ Cette commande ne fonctionne que sur les annonces LFM du bot.',
        });
        return;
      }

      // Check if message has embeds (LFM messages have embeds)
      if (!message.embeds || message.embeds.length === 0) {
        await interaction.editReply({
          content: '❌ Ce message ne semble pas être une annonce LFM.',
        });
        return;
      }

      // Extract request ID from footer
      const embed = message.embeds[0];
      const footer = embed.footer?.text;

      if (!footer || !footer.startsWith('ID: ')) {
        await interaction.editReply({
          content: '❌ Ce message ne semble pas être une annonce LFM.',
        });
        return;
      }

      const requestId = footer.replace('ID: ', '');

      // Get the request
      const request = await LFMService.getRequest(requestId);

      if (!request) {
        await interaction.editReply({
          content: '❌ Cette annonce n\'existe plus ou a déjà été supprimée.',
        });
        return;
      }

      // Check if user is the request owner or has admin permissions
      const isOwner = request.userId === interaction.user.id;
      const isAdmin = interaction.memberPermissions?.has('ManageMessages');

      if (!isOwner && !isAdmin) {
        await interaction.editReply({
          content: '❌ Seul le créateur de l\'annonce ou un administrateur peut l\'annuler.',
        });
        return;
      }

      // Cancel the request
      await LFMService.updateStatus(requestId, 'cancelled');

      // Update the message
      const gameColor = await GameDBService.getGameColor(interaction.guildId!, request.game);
      const gameBanner = await GameDBService.getGameBanner(interaction.guildId!, request.game);
      const updatedEmbed = LFMService.createLFMEmbed(request, await interaction.client.users.fetch(request.userId), gameColor, gameBanner);

      try {
        await message.edit({
          embeds: [updatedEmbed],
          components: [], // Remove buttons
        });
      } catch (error) {
        console.error('Failed to update message:', error);
      }

      // Notify interested users
      for (const userId of request.interestedUsers) {
        try {
          const user = await interaction.client.users.fetch(userId);
          await user.send({
            content: `🔴 L'annonce LFM pour **${request.game}** que vous aviez rejoint a été annulée.`,
          });
        } catch (error) {
          console.error(`Failed to send DM to user ${userId}:`, error);
        }
      }

      await interaction.editReply({
        content: `✅ L'annonce LFM a été annulée avec succès.`,
      });
    } catch (error) {
      console.error('Error in LFM cancel context menu:', error);
      const errorMessage = '❌ Une erreur est survenue lors de l\'annulation de l\'annonce.';

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
      }
    }
  },
};

import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, TextChannel } from 'discord.js';
import { BotClient } from '../../../bot/client';

export default {
  data: new SlashCommandBuilder()
    .setName('reply')
    .setDescription('Fait répondre le bot à un message spécifique')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option
        .setName('channel-id')
        .setDescription('L\'ID du channel où se trouve le message')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('message-id')
        .setDescription('L\'ID du message à répondre')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('contenu')
        .setDescription('Le contenu de la réponse du bot')
        .setRequired(true)
        .setMaxLength(2000)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const channelId = interaction.options.getString('channel-id', true);
      const messageId = interaction.options.getString('message-id', true);
      const content = interaction.options.getString('contenu', true);

      // Récupérer le channel
      const channel = await client.channels.fetch(channelId).catch(() => null);

      if (!channel) {
        await interaction.editReply({
          content: '❌ Channel introuvable. Vérifiez l\'ID du channel.'
        });
        return;
      }

      if (!channel.isTextBased()) {
        await interaction.editReply({
          content: '❌ Ce channel n\'est pas un channel textuel.'
        });
        return;
      }

      // Récupérer le message
      const message = await (channel as TextChannel).messages.fetch(messageId).catch(() => null);

      if (!message) {
        await interaction.editReply({
          content: '❌ Message introuvable. Vérifiez l\'ID du message.'
        });
        return;
      }

      // Répondre au message
      await message.reply({
        content: content
      });

      await interaction.editReply({
        content: `✅ Réponse envoyée avec succès dans <#${channelId}> !\n\n**Contenu :** ${content}`
      });

    } catch (error) {
      console.error('Erreur dans la commande reply:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Une erreur inconnue est survenue';

      await interaction.editReply({
        content: `❌ Erreur lors de l'envoi de la réponse :\n\`\`\`${errorMessage}\`\`\``
      });
    }
  }
};

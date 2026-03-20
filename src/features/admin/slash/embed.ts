import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  TextChannel,
  EmbedBuilder,
} from 'discord.js';
import { BotClient } from '../../../bot/client';

export const EMBED_EDIT_MODAL_PREFIX = 'embed:edit_modal:';

export default {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Outils de gestion des embeds')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('edit')
        .setDescription('Modifier un embed existant')
        .addStringOption((opt) =>
          opt.setName('message_id').setDescription('ID du message contenant l\'embed').setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName('channel_id').setDescription('ID du channel (ce channel par défaut)').setRequired(false),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const sub = interaction.options.getSubcommand();
    if (sub !== 'edit') return;

    const messageId = interaction.options.getString('message_id', true).trim();
    const channelIdRaw = interaction.options.getString('channel_id')?.trim();
    const channelId = channelIdRaw || interaction.channelId;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      await interaction.reply({ content: '❌ Channel introuvable.', flags: MessageFlags.Ephemeral });
      return;
    }

    const message = await (channel as TextChannel).messages.fetch(messageId).catch(() => null);
    if (!message) {
      await interaction.reply({ content: '❌ Message introuvable.', flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = message.embeds[0];
    if (!embed) {
      await interaction.reply({ content: '❌ Ce message ne contient pas d\'embed.', flags: MessageFlags.Ephemeral });
      return;
    }

    const colorHex =
      embed.color != null
        ? `#${embed.color.toString(16).padStart(6, '0').toUpperCase()}`
        : '';

    const modal = new ModalBuilder()
      .setCustomId(`${EMBED_EDIT_MODAL_PREFIX}${channelId}:${messageId}`)
      .setTitle('Modifier l\'embed')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Titre')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(embed.title ?? ''),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setValue(embed.description ?? ''),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('color')
            .setLabel('Couleur (hex, ex: #FF5733)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(colorHex),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('image')
            .setLabel('URL image (grand format)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(embed.image?.url ?? ''),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('thumbnail')
            .setLabel('URL thumbnail (haut à droite)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(embed.thumbnail?.url ?? ''),
        ),
      );

    await interaction.showModal(modal);
  },

  async handleEditModal(interaction: ModalSubmitInteraction, client: BotClient) {
    const [channelId, messageId] = interaction.customId
      .replace(EMBED_EDIT_MODAL_PREFIX, '')
      .split(':');

    const title = interaction.fields.getTextInputValue('title').trim();
    const description = interaction.fields.getTextInputValue('description').trim();
    const colorRaw = interaction.fields.getTextInputValue('color').trim();
    const imageUrl = interaction.fields.getTextInputValue('image').trim();
    const thumbnailUrl = interaction.fields.getTextInputValue('thumbnail').trim();

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      await interaction.editReply({ content: '❌ Channel introuvable.' });
      return;
    }

    const message = await (channel as TextChannel).messages.fetch(messageId).catch(() => null);
    if (!message) {
      await interaction.editReply({ content: '❌ Message introuvable.' });
      return;
    }

    const existingEmbed = message.embeds[0];
    if (!existingEmbed) {
      await interaction.editReply({ content: '❌ L\'embed a disparu.' });
      return;
    }

    const newEmbed = EmbedBuilder.from(existingEmbed);
    newEmbed.setTitle(title || null);
    newEmbed.setDescription(description || null);
    newEmbed.setImage(imageUrl || null);
    newEmbed.setThumbnail(thumbnailUrl || null);

    if (colorRaw) {
      const colorNum = parseInt(colorRaw.replace('#', ''), 16);
      if (!isNaN(colorNum)) newEmbed.setColor(colorNum);
    } else {
      newEmbed.setColor(null);
    }

    const otherEmbeds = message.embeds.slice(1).map((e) => EmbedBuilder.from(e));
    await message.edit({ embeds: [newEmbed, ...otherEmbeds] });

    await interaction.editReply({ content: '✅ Embed modifié avec succès.' });
  },
};

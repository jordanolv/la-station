import {
  MessageFlags,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  UserContextMenuCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { UserMountainsRepository } from '../repositories/user-mountains.repository';
import { PACK_TIER_CONFIG } from '../constants/peak-hunters.constants';
import type { PackTier } from '../types/peak-hunters.types';

export const GIVE_EXPEDITION_BUTTON_PREFIX = 'give_pack:';
export const GIVE_EXPEDITION_MODAL_PREFIX = 'give_pack_modal:';

export default {
  data: new ContextMenuCommandBuilder()
    .setName('Donner une expédition')
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: UserContextMenuCommandInteraction, _client: BotClient) {
    const target = interaction.targetUser;

    await interaction.reply({
      content: `Quelle expédition donner à **${target.username}** ?`,
      flags: MessageFlags.Ephemeral,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`${GIVE_EXPEDITION_BUTTON_PREFIX}${target.id}:sentier`)
            .setLabel('Sentier')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`${GIVE_EXPEDITION_BUTTON_PREFIX}${target.id}:falaise`)
            .setLabel('Falaise')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`${GIVE_EXPEDITION_BUTTON_PREFIX}${target.id}:sommet`)
            .setLabel('Sommet')
            .setStyle(ButtonStyle.Danger),
        ),
      ],
    });
  },

  async handleButton(interaction: ButtonInteraction, _client: BotClient): Promise<void> {
    const withoutPrefix = interaction.customId.slice(GIVE_EXPEDITION_BUTTON_PREFIX.length);
    const colonIdx = withoutPrefix.lastIndexOf(':');
    const targetId = withoutPrefix.slice(0, colonIdx);
    const tier = withoutPrefix.slice(colonIdx + 1) as PackTier;

    const { label } = PACK_TIER_CONFIG[tier];
    const modal = new ModalBuilder()
      .setCustomId(`${GIVE_EXPEDITION_MODAL_PREFIX}${targetId}:${tier}`)
      .setTitle(`Expéditions ${label}`)
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('Nombre d\'expéditions à donner')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 3')
            .setMinLength(1)
            .setMaxLength(3)
            .setRequired(true),
        ),
      );

    await interaction.showModal(modal);
  },

  async handleModalSubmit(interaction: ModalSubmitInteraction, _client: BotClient): Promise<void> {
    const withoutPrefix = interaction.customId.slice(GIVE_EXPEDITION_MODAL_PREFIX.length);
    const colonIdx = withoutPrefix.lastIndexOf(':');
    const targetId = withoutPrefix.slice(0, colonIdx);
    const tier = withoutPrefix.slice(colonIdx + 1) as PackTier;

    const raw = interaction.fields.getTextInputValue('amount').trim();
    const amount = parseInt(raw, 10);

    if (isNaN(amount) || amount <= 0) {
      await interaction.reply({ content: '❌ Nombre invalide.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await UserMountainsRepository.addTickets(targetId, amount, tier);

    const { label, emoji } = PACK_TIER_CONFIG[tier];
    await interaction.editReply({
      content: `✅ **+${amount} expédition${amount > 1 ? 's' : ''}** ${emoji} **${label}** données à <@${targetId}>.`,
    });
  },
};

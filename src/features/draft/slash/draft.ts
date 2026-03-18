import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { DraftService, pendingSetups } from '../services/draft.service';

export default {
  data: new SlashCommandBuilder()
    .setName('draft')
    .setDescription('🎯 Organisez un draft entre deux équipes')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient): Promise<void> {
    const setupId = interaction.id;
    pendingSetups.set(setupId, { hostId: interaction.user.id });

    await interaction.reply({
      components: [DraftService.buildSetupContainer(), ...DraftService.buildSetupActionRows(setupId)],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { CdmService } from '../services/cdm.service';
import { buildAdminMain } from '../utils/cdm-renderer';

export default {
  data: new SlashCommandBuilder()
    .setName('cdm-admin')
    .setDescription('Gérer les pronostics de la Coupe du Monde (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    const event = await CdmService.getEvent();
    await interaction.reply({
      components: buildAdminMain(event),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },
};

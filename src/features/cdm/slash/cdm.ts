import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { CdmService } from '../services/cdm.service';
import { buildMain } from '../utils/cdm-renderer';

export default {
  data: new SlashCommandBuilder()
    .setName('cdm')
    .setDescription('Pronostique le vainqueur et l\'outsider de la Coupe du Monde'),

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    const event = await CdmService.getEvent();

    await interaction.reply({
      components: buildMain(event, interaction.user.id),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },
};

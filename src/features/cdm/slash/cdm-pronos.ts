import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import { CdmService } from '../services/cdm.service';
import { buildPronosList } from '../utils/cdm-renderer';

export default {
  data: new SlashCommandBuilder()
    .setName('cdm-pronos')
    .setDescription('Voir les pronostics CDM de tout le monde'),

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    const event = await CdmService.getEvent();
    await interaction.reply({
      components: buildPronosList(event),
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

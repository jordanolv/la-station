import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { BotClient } from '../../../bot/client';
import GroupUIService from '../services/group-ui.service';

export default {
  data: new SlashCommandBuilder()
    .setName('group')
    .setDescription('🎮 Créer un groupe pour trouver des coéquipiers'),

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient) {
    const ui = GroupUIService.buildStep1();
    await interaction.reply({ ...ui, flags: ui.flags | MessageFlags.Ephemeral });
  },
};

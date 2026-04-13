import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { executeHome } from './subcommands/home';

export default {
  data: new SlashCommandBuilder()
    .setName('mountain')
    .setDescription('Ta collection de montagnes'),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    return executeHome(interaction, client);
  },
};

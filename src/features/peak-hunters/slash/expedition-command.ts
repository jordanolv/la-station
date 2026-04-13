import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { executePack } from './subcommands/pack';

export default {
  data: new SlashCommandBuilder()
    .setName('pack')
    .setDescription('Ouvre tes packs de montagnes'),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    return executePack(interaction, client);
  },
};

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { executeExpedition } from './subcommands/expedition';

export default {
  data: new SlashCommandBuilder()
    .setName('expedition')
    .setDescription('Lance tes expéditions de montagnes'),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    return executeExpedition(interaction, client);
  },
};

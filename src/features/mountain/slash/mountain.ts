import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { executeInv } from './subcommands/inv';
import { executePack } from './subcommands/pack';
import { executeLeaderboard } from './subcommands/leaderboard';

export default {
  data: new SlashCommandBuilder()
    .setName('mountain')
    .setDescription('Tout sur les montagnes')
    .addSubcommand(sub =>
      sub.setName('inv').setDescription('Consulte ta collection de montagnes débloquées'),
    )
    .addSubcommand(sub =>
      sub.setName('pack').setDescription('Ouvre tes packs de montagnes ou consulte ton solde de tickets'),
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard').setDescription('Classement des meilleurs collectionneurs du serveur'),
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const sub = interaction.options.getSubcommand();

    if (sub === 'inv') return executeInv(interaction, client);
    if (sub === 'pack') return executePack(interaction, client);
    if (sub === 'leaderboard') return executeLeaderboard(interaction, client);
  },
};

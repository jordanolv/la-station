import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { BotClient } from '../../../bot/client';
import ImpostorGamesConfigService from '../services/impostor-games-config.service';

export default {
  data: new SlashCommandBuilder()
    .setName('impostor')
    .setDescription('🕵️ Créez un jeu de l\'imposteur en private'),

  async execute(interaction: ChatInputCommandInteraction, _client: BotClient): Promise<void> {
    const games = ImpostorGamesConfigService.getGames();

    const select = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('impostor_gameselect')
        .setPlaceholder('Choisissez un jeu...')
        .addOptions(games.map((g) => ({ label: g.name, value: g.id, emoji: g.emoji }))),
    );

    await interaction.reply({
      content: '🕵️ **Imposteur** — Choisissez un jeu pour configurer la partie :',
      components: [select],
      flags: MessageFlags.Ephemeral,
    });
  },
};

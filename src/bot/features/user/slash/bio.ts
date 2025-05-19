import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { BotClient } from '../../../BotClient.js';
import { UserService } from '../../../../database/services/UserService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('bio')
    .setDescription('Mettre à jour votre bio')
    .addStringOption(option =>
      option.setName('value')
        .setDescription('Votre nouvelle bio')
        .setRequired(true)),
  async execute(client: BotClient, interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Cette commande doit être utilisée dans un serveur.',
        ephemeral: true
      });
      return;
    }

    const value = interaction.options.getString('value', true);
    const updatedUser = await UserService.updateGuildUser(interaction.user.id, interaction.guild.id, { bio: value });

    if (!updatedUser) {
      await interaction.reply({
        content: '❌ Utilisateur non trouvé.',
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      content: '✅ Votre bio a été mise à jour avec succès!',
      ephemeral: true
    });
  }
};
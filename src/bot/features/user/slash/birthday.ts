import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { BotClient } from '@/bot/BotClient';
import { UserService } from '@database/services/UserService';

export default {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Mettre à jour votre date de naissance')
    .addStringOption(option =>
      option.setName('value')
        .setDescription('Nouvelle date (format JJ/MM/AAAA)')
        .setRequired(true)),
  async execute(client: BotClient, interaction: ChatInputCommandInteraction) {
    const value = interaction.options.getString('value', true);
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = value.match(dateRegex);

    if (!match) {
      await interaction.reply({
        content: '❌ Format de date invalide. Utilisez le format JJ/MM/AAAA (ex: 21/12/1996)',
        ephemeral: true
      });
      return;
    }

    const [_, day, month, year] = match;
    const date = new Date(`${year}-${month}-${day}`);

    if (isNaN(date.getTime())) {
      await interaction.reply({
        content: '❌ Date invalide. Vérifiez que le jour et le mois sont corrects.',
        ephemeral: true
      });
      return;
    }

    const updatedUser = await UserService.updateGuildUser(interaction.user.id, interaction.guild.id, { 'infos.birthDate': date });

    if (!updatedUser) {
      await interaction.reply({
        content: '❌ Utilisateur non trouvé.',
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      content: '✅ Votre date de naissance a été mise à jour avec succès!',
      ephemeral: true
    });
  }
};
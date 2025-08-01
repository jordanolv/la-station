import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { LogsService } from '../services/logs.service';
import { GuildService } from '../../discord/services/guild.service';

export default {
  data: new SlashCommandBuilder()
    .setName('set-channel')
    .setDescription('Configure les channels pour différentes fonctionnalités')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option.setName('feature')
        .setDescription('La fonctionnalité à configurer')
        .setRequired(true)
        .addChoices(
          { name: 'Logs', value: 'logs' },
          { name: 'Anniversaires', value: 'birthday' },
          // On peut ajouter d'autres features ici plus tard
        ))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Le channel à configurer')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
          flags: [64] // MessageFlags.Ephemeral
        });
      }

      const feature = interaction.options.getString('feature', true);
      const channel = interaction.options.getChannel('channel', true);

      switch (feature) {
        case 'logs':
          await LogsService.setLogsChannel(interaction.guild.id, channel.id);
          await interaction.reply({
            content: `✅ Le channel ${channel} a été configuré pour les **logs** !`,
            flags: [64] // MessageFlags.Ephemeral
          });
          break;

        case 'birthday':
          // Exemple pour les anniversaires (à implémenter si nécessaire)
          const guild = await GuildService.getOrCreateGuild(interaction.guild.id, interaction.guild.name);
          if (!guild.config.channels) {
            guild.config.channels = new Map();
          }
          guild.config.channels.set('birthdayChannel', channel.id);
          await guild.save();
          
          await interaction.reply({
            content: `✅ Le channel ${channel} a été configuré pour les **anniversaires** !`,
            flags: [64] // MessageFlags.Ephemeral
          });
          break;

        default:
          await interaction.reply({
            content: '❌ Fonctionnalité non reconnue.',
            flags: [64] // MessageFlags.Ephemeral
          });
      }

    } catch (error) {
      console.error('Erreur dans la commande set-channel:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la configuration.',
        flags: [64] // MessageFlags.Ephemeral
      });
    }
  }
};
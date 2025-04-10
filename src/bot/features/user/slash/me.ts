import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { BotClient } from '../../../BotClient';
import UserModel from '../../../../database/models/User';
import { UserService } from '@database/services/UserService';

export default {
  data: new SlashCommandBuilder()
    .setName('me')
    .setDescription('Gérer vos informations personnelles')
    .addSubcommand(subcommand =>
      subcommand
        .setName('update')
        .setDescription('Mettre à jour une de vos informations')
        .addStringOption(option =>
          option.setName('field')
            .setDescription('Le champ à mettre à jour')
            .setRequired(true)
            .addChoices(
              { name: 'Bio', value: 'bio' },
              { name: 'Date de naissance', value: 'birthdate' }
            ))
        .addStringOption(option =>
          option.setName('value')
            .setDescription('La nouvelle valeur (format date: JJ/MM/AAAA)')
            .setRequired(true))),
    
  /**
   * Exécute la commande de mise à jour
   * @param interaction L'interaction Discord
   */
  async execute(client: BotClient, interaction: CommandInteraction) {
    try {
      const field = interaction.options.get('field')?.value as string;
      const value = interaction.options.get('value')?.value as string;

      if (!field || !value) {
        await interaction.reply({
          content: '❌ Paramètres manquants.',
          ephemeral: true
        });
        return;
      }

      const updateData: any = {};
      
      switch (field) {
        case 'bio':
          updateData.bio = value;
          break;
        case 'birthdate':
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

          updateData['infos.birthDate'] = date;
          break;
        default:
          await interaction.reply({
            content: '❌ Champ invalide.',
            ephemeral: true
          });
          return;
      }

      const user = await UserService.updateUser(interaction.user.id, updateData);

      if (!user) {
        await interaction.reply({
          content: '❌ Utilisateur non trouvé.',
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        content: '✅ Votre information a été mise à jour avec succès!',
        ephemeral: true
      });
    } catch (error) {
      console.error('Erreur dans la commande me update:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ Une erreur est survenue lors de la mise à jour.',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '❌ Une erreur est survenue lors de la mise à jour.',
          ephemeral: true
        });
      }
    }
  }
}; 
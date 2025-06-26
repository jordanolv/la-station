import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { UserService } from '../services/guildUser.service';
import { formatDate } from '../../../shared/utils/date-format';
import { emojis } from '../../../utils/emojis';

export default {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Définir ou afficher votre date d\'anniversaire')
    .addStringOption(option => 
      option
        .setName('date')
        .setDescription('Votre date d\'anniversaire au format JJ/MM/AAAA (laissez vide pour afficher)')
        .setRequired(false)
    ),
    
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.guildId) {
        await interaction.reply({
          content: '❌ Cette commande ne peut être utilisée que dans un serveur.',
          ephemeral: true
        });
        return;
      }

      const dateStr = interaction.options.getString('date');
      const user = await UserService.getGuildUserByDiscordId(interaction.user.id, interaction.guildId);

      if (!user) {
        await interaction.reply({
          content: '❌ Utilisateur non trouvé dans la base de données.',
          ephemeral: true
        });
        return;
      }

      // Si aucune date n'est fournie, afficher la date d'anniversaire actuelle
      if (!dateStr) {
        await interaction.reply({
          content: user.infos.birthDate 
            ? `🎂 **Votre date d'anniversaire :** ${formatDate(user.infos.birthDate)}` 
            : '🎂 Vous n\'avez pas encore défini de date d\'anniversaire. Utilisez `/birthday date:JJ/MM/AAAA` pour en définir une.',
          ephemeral: true
        });
        return;
      }

      // Valider et convertir la date
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const match = dateStr.match(dateRegex);
      
      if (!match) {
        await interaction.reply({
          content: `${emojis.error} Format de date invalide. Veuillez utiliser le format JJ/MM/AAAA (exemple: 01/01/1990).`,
          ephemeral: true
        });
        return;
      }

      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1; // Les mois commencent à 0 en JavaScript
      const year = parseInt(match[3]);
      
      const birthDate = new Date(year, month, day);
      
      // Vérifier que la date est valide
      if (
        birthDate.getDate() !== day || 
        birthDate.getMonth() !== month || 
        birthDate.getFullYear() !== year ||
        birthDate > new Date() // Date future
      ) {
        await interaction.reply({
          content: '❌ Date invalide. Veuillez entrer une date valide qui n\'est pas dans le futur.',
          ephemeral: true
        });
        return;
      }

      // Mettre à jour la date d'anniversaire
      user.infos.birthDate = birthDate;
      await user.save();

      await interaction.reply({
        content: `✅ Votre date d'anniversaire a été définie au ${formatDate(birthDate)} !`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Erreur dans la commande /birthday:', error);
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: '❌ Une erreur est survenue lors de l\'exécution de la commande.', 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ 
          content: '❌ Une erreur est survenue lors de l\'exécution de la commande.', 
          ephemeral: true 
        });
      }
    }
  }
}; 
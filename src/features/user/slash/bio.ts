import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction } from 'discord.js';
import { UserService } from '../services/guildUser.service';

export default {
  data: new SlashCommandBuilder()
    .setName('bio')
    .setDescription('Définir ou afficher votre biographie')
    .addStringOption(option => 
      option
        .setName('texte')
        .setDescription('Votre nouvelle biographie (laissez vide pour afficher votre bio actuelle)')
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

      const bioText = interaction.options.getString('texte');
      const user = await UserService.getGuildUserByDiscordId(interaction.user.id, interaction.guildId);

      if (!user) {
        await interaction.reply({
          content: '❌ Utilisateur non trouvé dans la base de données.',
          ephemeral: true
        });
        return;
      }

      // Si aucun texte n'est fourni, afficher la bio actuelle
      if (!bioText) {
        await interaction.reply({
          content: user.bio 
            ? `📝 **Votre biographie actuelle :** \n${user.bio}` 
            : '📝 Vous n\'avez pas encore défini de biographie. Utilisez `/bio texte:Votre bio` pour en définir une.',
          ephemeral: true
        });
        return;
      }

      // Mettre à jour la bio
      user.bio = bioText;
      await user.save();

      await interaction.reply({
        content: '✅ Votre biographie a été mise à jour avec succès !',
        ephemeral: true
      });
    } catch (error) {
      console.error('Erreur dans la commande /bio:', error);
      
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
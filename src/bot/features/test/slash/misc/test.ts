import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Une slash command de test aaaasssaaa'),
    
  /**
   * Exécute la slash command test
   * @param interaction L'interaction Discord
   */
  async execute(interaction: CommandInteraction) {
    try {
      await interaction.reply({
        content: '✅ La slash command test fonctionne correctement! v2',
        ephemeral: true
      });
    } catch (error) {
      console.error('Erreur dans la slash command test:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ Une erreur est survenue.',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '❌ Une erreur est survenue.',
          ephemeral: true
        });
      }
    }
  }
};
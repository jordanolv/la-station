import { Interaction } from 'discord.js';
import { BotClient } from '../../../BotClient';

export default {
  name: 'interactionCreate',
  once: false,
  
  async execute(client: BotClient, interaction: Interaction) {
    // Ne traiter que les slash commands
    if (!interaction.isCommand()) return;
    
    const command = client.slashCommands.get(interaction.commandName);
    if (!command) return;
    
    try {
      await command.execute(client, interaction);
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la commande ${interaction.commandName}:`, error);
      const errorMessage = 'Une erreur est survenue lors de l\'exécution de cette commande.';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};

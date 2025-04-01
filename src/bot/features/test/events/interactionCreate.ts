import { Interaction } from 'discord.js';
import { Event, BotClient } from '../../../interfaces/index';

const InteractionCreateEvent: Event = {
  name: 'interactionCreate',
  once: false,
  
  /**
   * Gère l'événement interactionCreate pour les slash commands
   * @param client Le client Discord
   * @param interaction L'interaction reçue
   */
  async execute(client: BotClient, interaction: Interaction) {
    // Ne traiter que les slash commands
    if (!interaction.isCommand()) return;
    
    const command = client.slashCommands.get(interaction.commandName);
    
    if (!command) return;
    
    // Exécution de la slash command
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la slash command ${interaction.commandName}:`, error);
      
      const errorMessage = 'Une erreur est survenue lors de l\'exécution de cette commande.';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};

export default InteractionCreateEvent;